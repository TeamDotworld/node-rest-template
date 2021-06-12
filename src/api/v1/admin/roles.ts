import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi } from "celebrate";
import { Logger } from "winston";
import { Container } from "typedi";

import passport from "passport";

import { RoleCreateInput } from "../../../interface/Role";
import RoleService from "../../../services/roles";

const route = Router();

export default (app: Router) => {
  app.use("/admin/roles", route);

  // Create new role
  route.post(
    "/",
    passport.authenticate("jwt", { session: false }),
    celebrate({
      body: Joi.object({
        name: Joi.string().required().normalize(),
        description: Joi.string().required().normalize(),
        permissions: Joi.array().items(Joi.string()).required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let role: RoleCreateInput = req.body;
        const permissionServiceInstance = Container.get(RoleService);
        const created = await permissionServiceInstance.CreateRole(role);

        return res.status(201).json({
          status: true,
          data: created,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // List roles
  route.get(
    "/",
    passport.authenticate("jwt", { session: false }),
    async (_: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        const permissionServiceInstance = Container.get(RoleService);
        const roles = await permissionServiceInstance.ListRoles();

        return res.json({
          status: true,
          data: roles,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // List roles
  route.get(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.params;
        const permissionServiceInstance = Container.get(RoleService);
        const role = await permissionServiceInstance.GetRole(id);

        return res.json({
          status: true,
          data: role,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Update role
  route.patch(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    celebrate({
      body: Joi.object({
        name: Joi.string().normalize().optional(),
        description: Joi.string().normalize().allow("").optional(),
        permissions: Joi.array().items(Joi.string()).required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.params;
        let role: RoleCreateInput = req.body;
        const roleService = Container.get(RoleService);
        const updated = await roleService.UpdateRole(id, role);

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
