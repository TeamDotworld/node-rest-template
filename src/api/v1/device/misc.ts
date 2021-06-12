import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi } from "celebrate";
import { Logger } from "winston";
import { Container } from "typedi";

import config from "../../../config";
import DeviceService from "../../../services/devices";
import { HttpError } from "../../errors";

const route = Router();

export default (app: Router) => {
  app.use("/misc/devices", route);

  route.post(
    "/",
    celebrate({
      body: Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        is_live_supported: Joi.boolean().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id, name, is_live_supported } = req.body;
        const deviceService = Container.get(DeviceService);
        const device = await deviceService.CreateDevice({
          id,
          name,
          is_live_supported,
          blocked: true,
        });

        return res.json({
          status: true,
          data: {
            id: device.id,
            name: device.name,
            is_live_supported: device.name,
          },
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Get device config
  route.get(
    "/:id/config",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.params;
        const deviceService = Container.get(DeviceService);
        const device = await deviceService.GetDevice(id);

        if (device.blocked) {
          throw new HttpError(
            403,
            "Device not approved. Contact your administrator."
          );
        }

        return res.json({
          status: true,
          data: {
            token: device.token,
            name: device.name,
            mqtt: {
              host: config.mqtt.host,
              username: config.mqtt.username,
              password: config.mqtt.password,
            },
          },
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
