import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi } from "celebrate";
import { Logger, stream } from "winston";
import { Container } from "typedi";
import passport from "passport";

import middleware from "@middleware/index";
import permissions from "@permission";
import CallService from "@service/calls";
import { LiveStreamCreateDTO } from "@interface/Call";

const route = Router();

export default (app: Router) => {
  app.use("/live", route);

  // List live
  route.get(
    "/",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.live.list),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.user;
        const streamServiceInst = Container.get(CallService);
        const list = await streamServiceInst.ListLiveStream(id);

        return res.status(200).json({
          status: true,
          message: "listing all public stream",
          data: list,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Get details
  route.get(
    "/:path",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.live.view),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { path } = req.params;
        const streamServiceInst = Container.get(CallService);
        const stream = await streamServiceInst.GetLiveStream(path);

        return res.status(200).json({
          status: true,
          message: "listing stream. If you have id you can access any stream.",
          data: stream,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Need permission
  route.patch(
    "/:id/like",
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id: user_id } = req.user;
        let { id: content_id } = req.params;
        let like = req.query.like;
        if (!like) {
          throw new Error("Invalid query parameter");
        }
        var isTrueSet = like === "true";

        const callService = Container.get(CallService);
        const content = await callService.LikeStream(
          user_id,
          content_id,
          isTrueSet
        );
        return res.status(200).json({
          status: true,
          data: content,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Create a stream
  route.post(
    "/",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.live.create),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let user = req.user;
        let data: LiveStreamCreateDTO = req.body;
        const streamServiceInst = Container.get(CallService);
        const created = await streamServiceInst.CreateLiveStream(user.id, data);

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

  // only for creator of live
  // start the livestream using this. This will create twilio channel
  route.post(
    "/:path/start",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.live.create),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.user;
        let { path } = req.params;
        const streamServiceInst = Container.get(CallService);
        const created = await streamServiceInst.StartLiveStream(id, path);

        return res.status(200).json({
          status: true,
          data: created,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // end live stream
  route.patch(
    "/:path/end",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.live.create),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.user;
        let { path } = req.params;
        const streamServiceInst = Container.get(CallService);
        const ended = await streamServiceInst.EndLiveStream(id, path);

        return res.status(200).json({
          status: true,
          data: ended,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  route.get(
    "/:path/join",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.live.join),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id } = req.user;
        let { path } = req.params;

        const streamServiceInst = Container.get(CallService);
        const created = await streamServiceInst.GenerateAccessToken(id, path);

        return res.status(200).json({
          status: true,
          data: created,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  //https://www.digitalocean.com/community/tutorials/nodejs-server-sent-events-build-realtime-app
  route.get(
    "/:path/events",
    passport.authenticate("jwt", { session: false }),
    middleware.checkRole(permissions.live.broadcast),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { path } = req.params;
        let { id } = req.user;
        res.set({
          "Cache-Control": "no-cache",
          "Content-Type": "text/event-stream",
          Connection: "keep-alive",
        });
        res.flushHeaders();

        // Tell the client to retry every 10 seconds if connectivity is lost
        res.write("retry: 10000\n\n");
        const streamServiceInst = Container.get(CallService);

        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 60 * 1000));

          let time = new Date();
          time.setSeconds(time.getSeconds() - 10);

          const stream = await streamServiceInst.GetComments(id, path, time);
          if (stream != null) {
            res.write(`event: comments\ndata: ${JSON.stringify(stream)}\n\n`);
          }
        }
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Need permission
  route.post(
    "/:id/broadcast",
    celebrate({
      body: Joi.object({
        devices: Joi.array().items(Joi.string()).required(),
      }),
    }),
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id: user_id } = req.user;
        let { id: stream_id } = req.params;
        let { devices } = req.body;

        const streamServiceInst = Container.get(CallService);
        const created = await streamServiceInst.BroadcastStream(
          user_id,
          stream_id,
          devices
        );

        return res.status(200).json({
          status: true,
          data: created,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
