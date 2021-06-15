import { Container } from "typedi";
import LoggerInstance from "./logger";
import twilioClient from "./twilio";

// import mqttClient from "./mqtt";
import prisma from "./prisma";

export default () => {
  try {
    Container.set("prisma", prisma);
    Container.set("logger", LoggerInstance);
    Container.set("twilio", twilioClient);
    // Container.set("mqtt", mqttClient);
    LoggerInstance.info("✌️ Dependency injected into container");
  } catch (e) {
    LoggerInstance.error("🔥 Error on dependency injector loader: %o", e);
    throw e;
  }
};
