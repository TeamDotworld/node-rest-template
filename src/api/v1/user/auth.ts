import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";
import { Container } from "typedi";
import jwt from "jsonwebtoken";

import AuthService from "../../../services/auth";
import middlewares from "../../../middlewares";
import config from "../../../config";
import UserService from "../../../services/users";
import helpers from "../../../helpers";
import base64url from "base64url";
import { BadRequestError, HttpError } from "../../../api/errors";

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

  // Generate webauthn challenge
  route.get(
    "/webauthn/challenge",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let email = req.query.email as string;
        if (!email) throw new BadRequestError("Invalid request");

        const userServiceInstance = Container.get(UserService);
        const user = await userServiceInstance.GetUserByEmail(email);

        let challenge = jwt.sign({}, config.fido.challenge_secret, {
          expiresIn: 120 * 1000,
        });

        let challengeMakeCred = helpers.generateServerMakeCredRequest(
          user.email,
          user.first_name,
          user.credential_id,
          challenge
        );
        challengeMakeCred["status"] = "ok";

        return res.json({
          status: true,
          data: {
            email: user.email,
            options: challengeMakeCred,
          },
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
    async (request: Request, response: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { email } = request.body;
        if (!email) throw new BadRequestError("Invalid request");

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
        const user = await userServiceInstance.GetUserByEmail(email);
        let result;
        if (webauthnResp.response.authenticatorData !== undefined) {
          /* This is get assertion */
          logger.info("Authenticating...");
          let authenticators = await userServiceInstance.GetAuthenticators(
            user.id
          );

          result = helpers.verifyAuthenticatorAssertionResponse(
            webauthnResp,
            authenticators.map((a) => a.auth_info)
          );

          if (result.verified) {
            let token = helpers.generateLoginToken(user);
            let resp_user = {
              id: user.id,
              email: user.email,
              name: `${user.first_name} ${user.last_name}`.trim(),
            };

            return response.json({
              status: true,
              data: {
                user: resp_user,
                token,
              },
            });
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
