import { Container } from "typedi";
import LoggerInstance from "./logger";
import twilioClient from "./twilio";

import mqttClient from "./mqtt";
import prismaDb from "./prismaDb";

export default () => {
  try {
    Container.set("logger", LoggerInstance);
    Container.set("twilio", twilioClient);
    Container.set("prisma", prismaDb());
    Container.set("mqtt", mqttClient);
    LoggerInstance.info("✌️ Dependency injected into container");
  } catch (e) {
    LoggerInstance.error("🔥 Error on dependency injector loader: %o", e);
    throw e;
  }
};
