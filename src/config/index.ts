import { parse } from "dotenv";

const dotenv = require("dotenv");

const envFound = dotenv.config();
if (envFound.error) {
  throw new Error("⚠️ Couldn't find .env file ⚠️");
}

process.env.NODE_ENV = process.env.NODE_ENV || "development";
process.env.PORT = process.env.PORT || "8000";
export default {
  host: process.env.HOST || "127.0.0.1",
  port: parseInt(process.env.PORT) || 8000,
  logs: {
    level: process.env.LOG_LEVEL || "silly",
  },
  keys: {
    public: process.env.PUBLIC_KEY || "",
    private: process.env.PRIVATE_KEY || "",
  },
  role: {
    super_admin: process.env.SUPER_ADMIN || "super_admin",
  },
  seed: parseInt(process.env.SEED) || 12,
  api: {
    v1: {
      user: "/api/v1",
      admin: "/api/v1/admin",
      device: "/api/v1/devices",
    },
  },
  sendgrid: process.env.SENDGRID_API_KEY,
  twilio: {
    account_sid: process.env.TWILIO_ACCOUNT_SID || "",
    api_key: process.env.TWILIO_API_KEY || "",
    api_secret: process.env.TWILIO_API_SECRET || "",
    auth_token: process.env.TWILIO_AUTH_TOKEN || "",
  },
  cloudinary: process.env.CLOUDINARY_URL || "",
  mqtt: {
    host: process.env.MQTT_HOST,
    username: process.env.MQTT_USERNAME || "",
    password: process.env.MQTT_PASSWORD || "",
    subscription: process.env.MQTT_SUBSCRIPTION || "",
    reconnect: parseInt(process.env.MQTT_RECONNECT) || 10 * 1000,
  },
};
