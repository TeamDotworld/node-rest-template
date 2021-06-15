import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";
import { Container } from "typedi";
import base64url from "base64url";

import config from "../../../config";
import AuthService from "../../../services/auth";
import middlewares from "../../../middlewares";
import UserService from "../../../services/users";
import { BadRequestError, UnauthorizedError } from "../../../api/errors";
import {
  generateAssertionOptions,
  GenerateAssertionOptionsOpts,
  VerifiedAssertion,
  verifyAssertionResponse,
  VerifyAssertionResponseOpts,
} from "@simplewebauthn/server";
import { AuthenticatorDevice } from "@simplewebauthn/typescript-types";
import helpers from "../../../helpers";
import { AssertionCredentialJSONExtra } from "../../../interface/User";

const route = Router();

export default (app: Router) => {
  app.use("/auth", route);

  route.post(
    "/",
    middlewares.validation.loginSchema,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug("Calling Sign-In endpoint with body: %o", req.body);
      try {
        const { email, password } = req.body;
        var ip = req.socket.remoteAddress || req.headers["x-forwarded-for"];

        const authServiceInstance = Container.get(AuthService);

        const resp = await authServiceInstance.Login(email, password, ip);
        return res.json({
          status: true,
          data: {
            user: resp.user,
            token: resp.token,
          },
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  route.get("/pk", async (_: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get("logger");
    try {
      const authServiceInstance = Container.get(AuthService);
      const pk = await authServiceInstance.GetPk();
      return res.json({
        status: true,
        data: pk,
      });
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });

  route.post(
    "/reset",
    celebrate({
      body: Joi.object({
        email: Joi.string().email().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug("Calling reset password endpoint with body: %o", req.body);
      try {
        const { email } = req.body;
        const authServiceInstance = Container.get(AuthService);
        const user = await authServiceInstance.ResetPassword(email);

        return res.json({
          status: true,
          data: {
            ...user,
          },
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  route.get(
    "/magic",
    celebrate({
      [Segments.QUERY]: {
        email: Joi.string().trim().email().required(),
      },
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug("Calling reset password endpoint with body: %o", req.body);
      try {
        const { email } = req.query;
        let mailId = email as string;
        const authServiceInstance = Container.get(AuthService);
        const address = await authServiceInstance.SendMagicLink(mailId);

        return res.json({
          status: true,
          data: address,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  route.post(
    "/magic/exchange",
    middlewares.validation.tokenExchangeSchema,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug("Calling login with token exchange");
      try {
        const { token } = req.body;
        var ip = req.socket.remoteAddress || req.headers["x-forwarded-for"];

        const authServiceInstance = Container.get(AuthService);

        const resp = await authServiceInstance.verifyMagicToken(token, ip);
        return res.json({
          status: true,
          data: {
            user: resp.user,
            token: resp.token,
          },
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Generate assertion options
  route.get(
    "/webauthn/challenge",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let email = req.query.email as string;
        if (!email) throw new BadRequestError("Invalid request");
        const userService: UserService = Container.get(UserService);

        const user = await userService.GetUserByEmail(email);
        const fido_devices = await userService.GetWebAuthn(user.id);

        const opts: GenerateAssertionOptionsOpts = {
          timeout: 60000,
          allowCredentials: fido_devices.map((dev) => ({
            id: Buffer.from(dev.credentialID, "base64"),
            type: "public-key",
            transports: ["usb", "ble", "nfc", "internal"],
          })),
          userVerification: "preferred",
          rpID: config.rpID,
        };

        const options = generateAssertionOptions(opts);

        await userService.SaveUserChallenge(user.id, options.challenge);

        return res.json({
          status: true,
          data: options,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Authenticate user using webauthn
  route.post(
    "/webauthn",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        const body: AssertionCredentialJSONExtra = req.body;

        const userService: UserService = Container.get(UserService);
        const user = await userService.GetUserByEmail(body.email);
        const fido_devices = await userService.GetWebAuthn(user.id);

        const expectedChallenge = user.fido_challenge;

        const bodyCredIDBuffer = base64url.toBuffer(body.data.rawId);
        const authenticator = fido_devices.find(
          (auths) =>
            auths.credentialID ===
            Buffer.from(bodyCredIDBuffer).toString("base64")
        );

        let dbAuthenticator: AuthenticatorDevice = {
          counter: Number(authenticator.counter),
          credentialID: Buffer.from(authenticator.credentialID, "base64"),
          credentialPublicKey: Buffer.from(
            authenticator.credentialPublicKey,
            "base64"
          ),
        };

        if (!dbAuthenticator) {
          throw new Error(
            `could not find authenticator matching ${body.data.id}`
          );
        }

        let verification: VerifiedAssertion;
        try {
          const opts: VerifyAssertionResponseOpts = {
            credential: body.data,
            expectedChallenge: `${expectedChallenge}`,
            expectedOrigin: config.frontend,
            expectedRPID: config.rpID,
            authenticator: dbAuthenticator,
          };
          verification = verifyAssertionResponse(opts);
        } catch (error) {
          console.error(error);
          throw new BadRequestError(
            error.message || "failed to create validator"
          );
        }

        const { verified, assertionInfo } = verification;
        if (verified) {
          logger.info(
            `Updating new assertion count to ${assertionInfo.newCounter}`
          );
          logger.info("Credential Id is %o", assertionInfo.credentialID);
          await userService.UpdateWebAuthnCounter(
            authenticator.id,
            assertionInfo.newCounter
          );
          logger.info("updated assertion count");

          let token = helpers.generateLoginToken(user);

          return res.json({
            status: true,
            data: {
              user: {
                id: user.id,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`.trim(),
              },
              token,
            },
          });
        }
        throw new UnauthorizedError("Verification of webauthn failed");
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
