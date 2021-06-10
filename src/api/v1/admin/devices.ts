import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi } from "celebrate";
import passport from "passport";
import { Logger } from "winston";
import { Container } from "typedi";

import middleware from "@middleware/index";
import DeviceService from "@service/devices";
import permissions from "@permission";

const route = Router();

export default (app: Router) => {
  app.use("/devices", route);

  // List devices
  route.get(
    "/",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.admin.super),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        const authServiceInstance = Container.get(DeviceService);
        const devices = await authServiceInstance.ListDevices();

        return res.json({
          status: true,
          data: devices,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Get device by id
  route.get(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.admin.super),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.params;
        const authServiceInstance = Container.get(DeviceService);
        const device = await authServiceInstance.GetDevice(id);

        return res.json({
          status: true,
          data: device,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Create device
  route.post(
    "/",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.admin.super),
    celebrate({
      body: Joi.object({
        name: Joi.string().required(),
        is_live_supported: Joi.boolean().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        throw new Error("Device creation using this api was deprecated.");

        let { name, is_live_supported } = req.body;

        const authServiceInstance = Container.get(DeviceService);
        const device = await authServiceInstance.CreateDevice({
          name,
          is_live_supported,
        });

        res.status(201).json({
          status: true,
          data: device,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Update device
  route.patch(
    "/:id",
    celebrate({
      body: Joi.object({
        name: Joi.string().required(),
        is_live_supported: Joi.boolean().required(),
        blocked: Joi.boolean().required(),
      }),
    }),
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.admin.super),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.params;
        let { name, is_live_supported, blocked } = req.body;

        const authServiceInstance = Container.get(DeviceService);
        const updated = await authServiceInstance.UpdateDevice(id, {
          name,
          is_live_supported,
          blocked,
        });

        res.status(200).json({
          status: true,
          data: updated,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Delete device
  route.delete(
    "/:id",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.admin.super),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.params;

        const authServiceInstance = Container.get(DeviceService);
        const device = await authServiceInstance.DeleteDevice(id);

        res.status(200).json({
          status: true,
          data: device,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
