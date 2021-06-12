import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi } from "celebrate";
import { Logger } from "winston";
import { Container } from "typedi";
import passport from "passport";

import UserService from "../../../services/users";

import { UserCreateInputDTO, UserUpdateDTO } from "../../../interface/User";

const route = Router();

export default (app: Router) => {
  app.use("/admin/users", route);

  // List all users
  route.get(
    "/",
    passport.authenticate("jwt", { session: false }),
    async (_: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        const userServiceInstance = Container.get(UserService);
        const users = await userServiceInstance.ListUsers();

        return res.json({
          status: true,
          data: users,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Get a user
  route.get(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.params;
        const userServiceInstance = Container.get(UserService);
        const user = await userServiceInstance.GetUser(id);

        return res.json({
          status: true,
          data: user,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Create new user
  route.post(
    "/",
    passport.authenticate("jwt", { session: false }),
    celebrate({
      body: Joi.object({
        email: Joi.string().email().required(),
        first_name: Joi.string().required().normalize(),
        middle_name: Joi.string().normalize().allow("").optional(),
        last_name: Joi.string().normalize().allow("").optional(),
        username: Joi.string().required().normalize(),
        about: Joi.string().normalize().allow("").optional(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let user: UserCreateInputDTO = req.body;
        const userServiceInstance = Container.get(UserService);
        const created = await userServiceInstance.CreateUser(user);

        return res.json({
          status: true,
          data: created,
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
    passport.authenticate("jwt", { session: false }),
    celebrate({
      body: Joi.object({
        email: Joi.string().email().optional(),
        first_name: Joi.string().normalize().optional(),
        middle_name: Joi.string().normalize().allow("").optional(),
        last_name: Joi.string().normalize().allow("").optional(),
        username: Joi.string().normalize().optional(),
        password: Joi.string().optional(),
        about: Joi.string().normalize().allow("").optional(),
        blocked: Joi.boolean().optional(),
        phone_number: Joi.number().allow("").optional(),
        devices: Joi.array().items(Joi.string()).optional(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.params;
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

  // Update user roles
  route.patch(
    "/:id/roles",
    passport.authenticate("jwt", { session: false }),
    celebrate({
      body: Joi.object({
        roles: Joi.array().items(Joi.string()).required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.params;
        let { roles } = req.body;
        const userServiceInstance = Container.get(UserService);
        const updated = await userServiceInstance.UpdateUserRoles(id, roles);

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
};
