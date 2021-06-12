import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";
import { Container } from "typedi";

import AuthService from "../../../services/auth";
import middlewares from "../../../middlewares";

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
};
