import express, { Express, Request, Response } from "express";
import { useExpressServer } from "routing-controllers";

import cors from "cors";
import passport from "passport";

import middleware from "../middlewares";

import v1controllers from "../api/v1";
import { LoggingMiddleware } from "../middlewares/LoggingMiddleware";
import { CustomErrorHandler } from "../middlewares/ExpressErrorMiddlewareInterface";

export default ({ app }: { app: Express }) => {
  app.get("/status", (req, res) => {
    res.status(200).end();
  });
  app.head("/status", (req, res) => {
    res.status(200).end();
  });

  // Useful if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
  // It shows the real origin IP in the heroku or Cloudwatch logs
  app.enable("trust proxy");

  // The magic package that prevents frontend developers going nuts
  // Alternate description:
  // Enable Cross Origin Resource Sharing to all origins by default
  app.use(cors());

  // Some sauce that always add since 2014
  // "Lets you use HTTP verbs such as PUT or DELETE in places where the client doesn't support it."
  // Maybe not needed anymore ?
  app.use(require("method-override")());

  // Middleware that transforms the raw string of req.body into json
  app.use(express.json());
  app.use(
    express.urlencoded({
      extended: true,
    })
  );

  app.use(passport.initialize());
  middleware.auth(passport);

  // Load API routes
  useExpressServer(app, {
    routePrefix: "/api",
    defaultErrorHandler: true,
    controllers: [...v1controllers],
    middlewares: [LoggingMiddleware, CustomErrorHandler],
  });

  app.use((req: Request, res: Response) => {
    if (!res.writableEnded) {
      res.status(404).json({
        status: 404,
        message: `Cannot ${req.method} ${req.url}`,
      });
    }
    res.end();
  });
};
