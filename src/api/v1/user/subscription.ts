import { Router, Request, Response, NextFunction } from "express";
import { celebrate, Joi } from "celebrate";
import { Logger, stream } from "winston";
import { Container } from "typedi";
import passport from "passport";
import multer from "multer";

import middleware from "@middleware/index";
import permissions from "@permission";
import ContentService from "@service/content";
import { LiveStreamCreateDTO } from "@interface/Call";
import helper from "@helpers/index";

import { v4 as uuidv4 } from "uuid";
import { ContentType, ListingType } from ".prisma/client";
import SubscriptionService from "@service/subscription";

const route = Router();

export default (app: Router) => {
  app.use("/subscribe", route);

  route.get(
    "/",
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id: user_id } = req.user;

        const subscribeService = Container.get(SubscriptionService);
        const subscription = await subscribeService.GetSubscriptions(user_id);

        return res.status(200).json({
          status: true,
          data: subscription,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  route.post(
    "/",
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id: user_id } = req.user;
        console.log(req.query);
        let subscribe_to = req.query.subscribe_to as string;

        if (!subscribe_to) {
          throw new Error("Subscription data not found.");
        }

        if (user_id === subscribe_to) {
          throw new Error("You cannot subscribe to yourself");
        }

        const subscribeService = Container.get(SubscriptionService);
        const subscription = await subscribeService.CreateSubscription(
          user_id,
          subscribe_to
        );

        return res.status(201).json({
          status: true,
          data: subscription,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  route.delete(
    "/",
    passport.authenticate("jwt", { session: false }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      try {
        let { id: user_id } = req.user;
        console.log(req.query);
        let unsubscribe = req.query.unsubscribe as string;

        if (!unsubscribe) {
          throw new Error("Subscription data not found.");
        }

        const subscribeService = Container.get(SubscriptionService);
        const subscription = await subscribeService.RemoveSubscription(
          user_id,
          unsubscribe
        );

        return res.status(200).json({
          status: true,
          data: subscription,
        });
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
