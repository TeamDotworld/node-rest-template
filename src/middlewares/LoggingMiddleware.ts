import { Middleware, ExpressMiddlewareInterface } from "routing-controllers";
import { Request } from "express";
import Container from "typedi";
import { Logger } from "winston";

@Middleware({ type: "before" })
export class LoggingMiddleware implements ExpressMiddlewareInterface {
  logger: Logger = Container.get("logger");
  use(req: Request, res: any, next: (err?: any) => any): void {
    try {
      let started = Date.now();
      this.logger.info(`Request ${req.method} ${req.path}`, {
        params: { ...req.body, ...req.params, ...req.query },
        origin: "API",
        http_method: req.method,
      });
      res.on("finish", () => {
        this.logger.info(
          `Response [${res.statusCode}] ${req.method} ${req.path}`,
          {
            duration: Date.now() - started,
            action_method: `${req.baseUrl}`,
            status: res.statusCode,
          }
        );
      });
    } catch (err) {
      console.error(err);
    }
    next();
  }
}
