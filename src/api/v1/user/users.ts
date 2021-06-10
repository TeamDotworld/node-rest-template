import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi } from "celebrate";
import { Logger } from "winston";
import { Container } from "typedi";
import passport from "passport";

import middleware from "@middleware/index";
import permissions from "@permission";
import UserService from "@service/users";
import { UserUpdateDTO } from "@interface/User";

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
    middleware.checkRole(permissions.profile.update),
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
    middleware.checkRole(permissions.profile.update),
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
};
