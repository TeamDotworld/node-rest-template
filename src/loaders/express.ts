import express, { Express, Request, Response } from "express";

import cors from "cors";
import crypto from "crypto";
import passport from "passport";
import cookieSession from "cookie-session";

import Logger from "./logger";
import v1Routes from "../api/v1";
import middleware from "../middlewares";

export default ({ app }: { app: Express }) => {
  app.use(middleware.loggingMiddleware);

  app.get("/health_check", (_, res) => {
    res.status(200).end();
  });
  app.head("/health_check", (_, res) => {
    res.status(200).end();
  });

  app.use(
    cookieSession({
      name: "session",
      keys: [crypto.randomBytes(32).toString("hex")],

      // Cookie Options
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    })
  );

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

  app.use(middleware.rateLimiter);

  app.use(passport.initialize());
  middleware.auth(passport);

  // version 1 routes
  v1Routes.forEach((route) => {
    app.use("/api/v1", route());
  });

  // catch 404
  app.use((req, res) => {
    return res.status(404).json({
      status: false,
      message: `${req.method} at ${req.path} not found`,
    });
  });

  app.use(middleware.errorMiddleware);

  app.use((error: any, _req: Request, res: Response, _next: any) => {
    return res.json({
      status: false,
      message: error.message || "internal server error",
    });
  });

  Logger.info("🕸 Booting up express...");
};
