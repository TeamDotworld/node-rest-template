const dotenv = require("dotenv");

const envFound = dotenv.config();
if (envFound.error) {
  throw new Error("⚠️ Couldn't find .env file ⚠️");
}

process.env.NODE_ENV = process.env.NODE_ENV || "development";
process.env.PORT = process.env.PORT || "8000";
export default {
  project_name: process.env.PROJECT_NAME || "Name not provied",
  host: process.env.HOST || "127.0.0.1",
  rpID: process.env.HOST || "localhost",
  frontend: process.env.FRONTEND_URL || "",
  port: parseInt(process.env.PORT) || 8000,
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  },
  logs: {
    level: process.env.LOG_LEVEL || "silly",
  },
  fido: {
    challenge_secret: process.env.FIDO_JWT_SECRET || "def@ulT",
  },
  keys: {
    public: process.env.PUBLIC_KEY || "",
    private: process.env.PRIVATE_KEY || "",
  },
  magic: {
    key:
      process.env.MAGIC_TOKEN_KEY ||
      Math.random().toString(36).substring(2, 10),
    expiry: process.env.MAGIC_TOKEN_EXPIRY || "5m",
    retry: process.env.MAGIC_TOKEN_RETRY
      ? parseInt(process.env.MAGIC_TOKEN_RETRY)
      : 5 * 60,
    link: process.env.MAGIC_TOKEN_LINK || "",
  },
  role: {
    super_admin: process.env.SUPER_ADMIN || "super_admin",
  },
  seed: parseInt(process.env.SEED) || 12,
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
