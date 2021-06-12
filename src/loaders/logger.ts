import winston from "winston";
import config from "../config";

/* const options = {
  servers: [
    { host: process.env.GRAYLOG_SERVER, port: process.env.GRAYLOG_PORT },
  ],
  hostname: `template-api-${process.env.NODE_ENV}`,
  facility: "node.js",
  bufferSize: 1350,
  level: "info",
  handleExceptions: true,
  json: true,
  maxsize: 5242880, // 5MB
  maxFiles: 5,
  staticMeta: { environment: `${process.env.NODE_ENV}` },
}; */

const transports = [];
if (process.env.NODE_ENV !== "production") {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.cli(),
        winston.format.splat()
      ),
    })
    // new WinstonGraylog2(options)
  );
} else {
  transports.push(new winston.transports.Console());
}

const LoggerInstance = winston.createLogger({
  level: config.logs.level,
  levels: winston.config.npm.levels,
  exitOnError: false,
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports,
});

export default LoggerInstance;
