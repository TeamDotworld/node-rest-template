import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi } from "celebrate";
import { Logger } from "winston";
import { Container } from "typedi";
import passport from "passport";
import jwt from "jsonwebtoken";

import config from "../../../config";
import UserService from "../../../services/users";
import { UserUpdateDTO } from "../../../interface/User";
import helpers from "../../../helpers";
import base64url from "base64url";
import { HttpError } from "../../../api/errors";

const route = Router();

export default (app: Router) => {
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

  // Register new webauthn
  route.post(
    "/webauthn",
    passport.authenticate("jwt", { session: false }),
    async (request: Request, response: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");

      try {
        let { id: user_id } = request.user;
        const userServiceInstance = Container.get(UserService);
        if (
          !request.body ||
          !request.body.id ||
          !request.body.rawId ||
          !request.body.response ||
          !request.body.type ||
          request.body.type !== "public-key"
        ) {
          return response.json({
            status: "failed",
            message:
              "Response missing one or more of id/rawId/response/type fields, or type is not public-key!",
          });
        }

        let webauthnResp = request.body;
        let clientData = JSON.parse(
          base64url.decode(webauthnResp.response.clientDataJSON)
        );

        /* Check challenge... */
        if (clientData.challenge) {
          try {
            jwt.verify(
              base64url.decode(clientData.challenge),
              config.fido.challenge_secret
            );
          } catch (err) {
            throw new HttpError(
              400,
              "Invalid challenge in collectedClientData. Challenge verification failed"
            );
          }
        }

        /* ...and origin */
        logger.info("Client Data origin " + clientData.origin);
        if (clientData.origin !== config.frontend) {
          return response.json({
            status: "failed",
            message: "Origin don't match!",
          });
        }

        let result;
        if (webauthnResp.response.attestationObject !== undefined) {
          /* This is create cred */
          result = helpers.verifyAuthenticatorAttestationResponse(webauthnResp);
          if (result.verified) {
            await userServiceInstance.CreateAuthenticatorData(
              user_id,
              "sample_tpm",
              result.authrInfo
            );
          }
        } else {
          return response.json({
            status: "failed",
            message: "Cannot determine type of response!",
          });
        }

        if (result.verified) {
          return response.json({ status: "ok" });
        } else {
          return response.json({
            status: "failed",
            message: "Can not authenticate signature!",
          });
        }
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
