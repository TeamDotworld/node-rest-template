import { Express } from "express";
import expressLoader from "./express";
import Logger from "./logger";
import dependencyInjectorLoader from "./dependencyInjector";

import "../subscribers/auth.events";
import "../subscribers/notification.events";

export default async (expressApp: Express) => {
  await dependencyInjectorLoader();
  await expressLoader({ app: expressApp });
  Logger.info("✌️ Express loaded");
};
