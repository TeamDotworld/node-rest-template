import { Twilio } from "twilio";

import config from "../config";
import Logger from "./logger";

// Initialize Twilio client
const getTwilioClient = () => {
  if (
    !config.twilio.account_sid ||
    !config.twilio.api_key ||
    !config.twilio.api_secret
  ) {
    throw new Error(`Unable to initialize Twilio client`);
  }
  let twilio = new Twilio(config.twilio.api_key, config.twilio.api_secret, {
    accountSid: config.twilio.account_sid,
  });

  Logger.info("📱 Twilio Loaded");
  return twilio;
};

const twilioClient = getTwilioClient();

export default twilioClient;
