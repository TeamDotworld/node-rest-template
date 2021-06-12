import { Request } from "express";
import Container from "typedi";
import { Logger } from "winston";

function loggingMiddleware(
  req: Request,
  res: any,
  next: (err?: any) => any
): void {
  try {
    let logger: Logger = Container.get("logger");

    let started = Date.now();
    logger.info(`Request ${req.method} ${req.path}`, {
      params: { ...req.body, ...req.params, ...req.query },
      origin: "API",
      http_method: req.method,
    });
    res.on("finish", () => {
      logger.info(`Response [${res.statusCode}] ${req.method} ${req.path}`, {
        duration: Date.now() - started,
        action_method: `${req.baseUrl}`,
        status: res.statusCode,
      });
    });
  } catch (err) {
    console.error(err);
  }
  next();
}

export default loggingMiddleware;
