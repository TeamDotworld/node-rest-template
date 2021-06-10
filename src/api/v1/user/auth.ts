import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi } from "celebrate";
import { Logger } from "winston";
import { Container } from "typedi";

import AuthService from "@service/auth";

const route = Router();

export default (app: Router) => {
  app.use("/auth", route);

  route.post(
    "/signin",
    celebrate({
      body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug("Calling Sign-In endpoint with body: %o", req.body);
      try {
        const { email, password } = req.body;
        var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

        const authServiceInstance = Container.get(AuthService);
        const { user, token } = await authServiceInstance.SignIn(
          email,
          password,
          ip
        );

        return res
          .json({
            status: true,
            data: {
              user,
              token,
            },
          })
          .status(200);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  route.get("/pk", async (req: Request, res: Response, next: NextFunction) => {
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
};
