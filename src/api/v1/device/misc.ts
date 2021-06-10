import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi } from "celebrate";
import { Logger } from "winston";
import { Container } from "typedi";
import passport from "passport";

import middleware from "@middleware/index";
import permissions from "@permission";
import UserService from "@service/users";
import { UserUpdateDTO } from "@interface/User";
import config from "@config";
import DeviceService from "@service/devices";
import { validateDevice } from "@api/middlewares/auth";
import CallService from "@service/calls";
import call from "../user/call";

const route = Router();

export default (app: Router) => {
  app.use("/", route);

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
          throw new Error("Device not approved. Contact your administrator.");
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

  route.get(
    "/:id/live/token",
    validateDevice(),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { device } = req;
        let { room_id } = req.query;
        if (!room_id) {
          throw new Error("Invalid request.");
        }
        let room = room_id as string;

        logger.info("Room id :" + room_id);

        const callService = Container.get(CallService);
        const live = await callService.GetLiveStream(room);

        const token = await callService.GenerateAccessToken(
          device.id,
          live.path
        );
        return res.json({
          status: true,
          data: {
            ...live,
            created_by: live.created_user_id,
            room_id: token.room_id,
            token: token.access_token,
          },
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
