import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi } from "celebrate";
import { Logger } from "winston";
import { Container } from "typedi";
import passport from "passport";
import QRCode from "qrcode";
import { authenticator } from "otplib";

import {
  GenerateAttestationOptionsOpts,
  generateAttestationOptions,
  VerifiedAttestation,
  VerifyAttestationResponseOpts,
  verifyAttestationResponse,
} from "@simplewebauthn/server";

import config from "../../../config";
import UserService from "../../../services/users";
import { UserUpdateDTO } from "../../../interface/User";
import { BadRequestError, HttpError } from "../../../api/errors";
import { AttestationCredentialJSON } from "@simplewebauthn/typescript-types";

const route = Router();

export default (app: Router) => {
  let twofaSecretsTmp = {};

  app.use("/users", route);

  // Get my details
  route.get(
    "/me",
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.user;
        const userServiceInstance = Container.get(UserService);
        const data = await userServiceInstance.GetProfile(id);

        return res.json({
          status: true,
          data: data,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Update a user
  route.patch(
    "/:id",
    celebrate({
      body: Joi.object({
        first_name: Joi.string().required().normalize(),
        middle_name: Joi.string().normalize().allow("").optional(),
        last_name: Joi.string().normalize().allow("").optional(),
        about: Joi.string().normalize().allow("").optional(),
      }),
    }),
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.user;
        let user: UserUpdateDTO = req.body;
        const userServiceInstance = Container.get(UserService);
        const updated = await userServiceInstance.UpdateUser(id, user);

        return res.json({
          status: true,
          data: updated,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Update a user
  route.patch(
    "/fcm",
    passport.authenticate("jwt", { session: false }),
    celebrate({
      body: Joi.object({
        token: Joi.string().required().normalize(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.user;
        let { token } = req.body;
        const userService = Container.get(UserService);
        const user = await userService.UpdateUserFcm(id, token);

        return res.status(200).json({
          status: true,
          data: user,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Attestation challenge
  route.get(
    "/webauthn/challenge",
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id: user_id, credential_id, first_name, last_name } = req.user;
        const userService = Container.get(UserService);
        let fido_devices = await userService.GetWebAuthn(user_id);

        const opts: GenerateAttestationOptionsOpts = {
          rpName: "Dotworld Technologies",
          rpID: config.rpID,
          userID: credential_id,
          userName: `${first_name} ${last_name}`,
          timeout: 60000,
          attestationType: "indirect",
          excludeCredentials: fido_devices.map((dev) => ({
            id: Buffer.from(dev.credentialID, "base64"),
            type: "public-key",
            transports: ["usb", "ble", "nfc", "internal"],
          })),
          authenticatorSelection: {
            userVerification: "preferred",
            requireResidentKey: false,
          },
        };

        const options = generateAttestationOptions(opts);

        await userService.SaveUserChallenge(user_id, options.challenge);

        res.send({
          status: true,
          data: options,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Verify Attestation
  route.post(
    "/webauthn",
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let name = req.query.name as string;
        if (!name) {
          throw new BadRequestError("Need name for saving after validation");
        }
        let { id: user_id } = req.user;
        const body: AttestationCredentialJSON = req.body;
        const userService = Container.get(UserService);

        let fido_devices = await userService.GetWebAuthn(user_id);
        let user = await userService.GetUser(user_id);

        const expectedChallenge = user.fido_challenge;

        let verification: VerifiedAttestation;
        try {
          const opts: VerifyAttestationResponseOpts = {
            credential: body,
            expectedChallenge: `${expectedChallenge}`,
            expectedOrigin: config.frontend,
            expectedRPID: config.rpID,
          };
          verification = await verifyAttestationResponse(opts);
        } catch (error) {
          console.error(error);
          throw new BadRequestError(
            error.message || "unable to start verification"
          );
        }

        const { verified, attestationInfo } = verification;

        if (verified && attestationInfo) {
          const { fmt, credentialPublicKey, credentialID, counter } =
            attestationInfo;

          const existingDevice = fido_devices.find(
            (device) =>
              device.credentialID ===
              Buffer.from(credentialID).toString("base64")
          );

          if (!existingDevice) {
            // Save the data to db
            await userService.CreateWebAuthnData(
              user_id,
              name,
              Buffer.from(credentialID).toString("base64"),
              Buffer.from(credentialPublicKey).toString("base64"),
              counter,
              {},
              fmt
            );
          } else {
            return res.json({
              status: false,
              message: "Device already registered",
              data: {
                verified: true,
              },
            });
          }
        }

        if (verified) {
          return res.json({
            status: true,
            data: {
              verified: verified,
            },
          });
        } else {
          throw new BadRequestError("Unable to verify");
        }
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // HOTP
  route.get(
    "/authenticator",
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id: user_id } = req.user;
        const userService = Container.get(UserService);
        const user = await userService.GetUser(user_id);

        if (user.authenticator && user.authenticator.enabled === true) {
          throw new HttpError(
            400,
            "Authenticator already enabled. Delete the old one to add new."
          );
        }

        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(
          user.email,
          config.project_name,
          secret
        );

        QRCode.toDataURL(otpauth, function (err, data_url) {
          if (err) throw new HttpError(500, "Unable to generate qr code");
          twofaSecretsTmp = {
            [user_id]: secret,
          };
          res.write(data_url);
          res.end();
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  route.post(
    "/authenticator/verify",
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id: user_id } = req.user;
        let { token } = req.body;
        const userService = Container.get(UserService);

        const user = await userService.GetUser(user_id);

        if (user.authenticator && user.authenticator.enabled === true) {
          throw new HttpError(
            400,
            "Authenticator already enabled. Delete the old one to add new."
          );
        }

        try {
          let secret = twofaSecretsTmp[user_id];
          const isValid = authenticator.verify({ token, secret });

          if (isValid) {
            await userService.CreateAuthenticatorData(secret, user_id);
            return res.json({
              status: true,
              data: {
                verified: true,
              },
            });
          } else {
            delete twofaSecretsTmp[user_id];
            throw new Error("Invalid verification code");
          }
        } catch (err) {
          throw new HttpError(
            400,
            "Unable to verify.Please try again." + err.message
          );
        }
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  route.delete(
    "/authenticator",
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id: user_id } = req.user;
        const userService = Container.get(UserService);
        await userService.RemoveAuthenticatorData(user_id);
        
        return res.json({
          status: true
        })
        
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
};
