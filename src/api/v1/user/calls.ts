import { Router, Request, Response, NextFunction } from "express";
import { Logger } from "winston";
import { Container } from "typedi";
import passport from "passport";

import CallsService from "../../../services/calls";
import helper from "../../../helpers/index";
import middlewares from "../../../middlewares";

const route = Router();

export default (app: Router) => {
	app.use("/calls", route);

	route.put(
		"/room",
		middlewares.validation.createRoomSchema,
		passport.authenticate("jwt", { session: false }),
		async (req: Request, res: Response, next: NextFunction) => {
			const logger: Logger = Container.get("logger");
			logger.debug("Creating room : %o", req.body);
			try {
				const { from, to } = req.body;
				const callServiceInstance = Container.get(CallsService);
				const room = await callServiceInstance.CreateRoom(helper.makeid(32), from, to);
				return res.json({
					status: true,
					data: {
						room
					},
				});
			} catch (e) {
				logger.error("🔥 error: %o", e);
				return next(e);
			}
		}
	);

	route.get("/token",
		middlewares.validation.twilioRoomIdSchema,
		passport.authenticate("jwt", { session: false }),
		async (req: Request, res: Response, next: NextFunction) => {
			const logger: Logger = Container.get("logger");
			try {
				let { room_id } = req.body;
				let { id: identity } = req.user;
				const callServiceInstance = Container.get(CallsService);
				const token = await callServiceInstance.GetAccessToken(room_id, identity);
				return res.json({
					status: true,
					data: token,
				});
			} catch (e) {
				logger.error("🔥 error: %o", e);
				return next(e);
			}
		});

	route.put(
		"/initiate",
		middlewares.validation.initiateCallSchema,
		passport.authenticate("jwt", { session: false }),
		async (req: Request, res: Response, next: NextFunction) => {
			const logger: Logger = Container.get("logger");
			logger.debug("Sending MQTT message to device: %o", req.body);
			try {
				const { device, room_id } = req.body;
				const callServiceInstance = Container.get(CallsService);
				const informedDevices = await callServiceInstance.AddParticipant(room_id, device)
				return res.json({
					status: true,
					data: {
						informedDevices,
					},
				});
			} catch (e) {
				logger.error("🔥 error: %o", e);
				return next(e);
			}
		}
	);

	route.put(
		"/disconnect",
		middlewares.validation.twilioRoomIdSchema,
		passport.authenticate("jwt", { session: false }),
		async (req: Request, res: Response, next: NextFunction) => {
			const logger: Logger = Container.get("logger");
			logger.debug("Sending notifications: %o", req.body);
			try {
				const { room_id } = req.body;
				const callServiceInstance = Container.get(CallsService);
				const callLog = await callServiceInstance.DisconnectRoom(room_id);

				return res.json({
					status: true,
					data: callLog,
				});
			} catch (e) {
				logger.error("🔥 error: %o", e);
				return next(e);
			}
		}
	);
};
