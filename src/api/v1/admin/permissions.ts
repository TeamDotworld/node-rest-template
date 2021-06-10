import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi } from "celebrate";
import { Logger } from "winston";
import { Container } from "typedi";

import passport from "passport";
import middleware from "@middleware/index";
import permissions from "@permission";

import PermissionService from "@service/permissions";
import { PermissionDTO, PermissionUpdateDTO } from "@interface/Permission";

const route = Router();

export default (app: Router) => {
  app.use("/permissions", route);

  // Get all permissions
  route.get(
    "/",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.admin.super),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        const permissionServiceInstance = Container.get(PermissionService);
        const users = await permissionServiceInstance.ListPermission();

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

  // Get a permission
  route.get(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.admin.super),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.params;
        const permissionServiceInstance = Container.get(PermissionService);
        const permission = await permissionServiceInstance.GetPermission(id);

        return res.json({
          status: true,
          data: permission,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Create permission
  route.post(
    "/",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.admin.super),
    celebrate({
      body: Joi.object({
        name: Joi.string().required().normalize(),
        description: Joi.string().required().normalize(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let permission: PermissionDTO = req.body;
        const permissionServiceInstance = Container.get(PermissionService);
        const created = await permissionServiceInstance.CreatePermission(
          permission
        );

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

  // Update permission
  route.patch(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.admin.super),
    celebrate({
      body: Joi.object({
        name: Joi.string().normalize().optional(),
        description: Joi.string().normalize().allow("").optional(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.params;
        let permission: PermissionUpdateDTO = req.body;
        const permissionServiceInstance = Container.get(PermissionService);
        const created = await permissionServiceInstance.UpdatePermission(
          id,
          permission
        );

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

  // Delete a permission
  route.delete(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.admin.super),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.params;
        const permissionServiceInstance = Container.get(PermissionService);
        const deleted = await permissionServiceInstance.DeletePermission(id);

        return res.json({
          status: true,
          data: deleted,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
