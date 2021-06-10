import express, { Express } from "express";
import cors from "cors";
import passport from "passport";

const { isCelebrateError, errors } = require("celebrate");

import middleware from "../api/middlewares";

import { useExpressServer } from "routing-controllers";
import v1controllers from "../api/v1";

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
    controllers: [...v1controllers],
  });

  /// catch 404
  app.use((req, res) => {
    return res.status(404).json({
      status: false,
      message: "not found",
    });
  });

  // catch the validation errors
  app.use((err, req, res, next) => {
    if (!isCelebrateError(err)) {
      return next(err);
    }
    const errorBody = err.details.get("body"); // 'details' is a Map()
    const {
      details: [errorDetails],
    } = errorBody;

    return res.status(400).json({
      status: false,
      message: errorDetails.message,
    });
  });

  /// Unauthorized error
  app.use((err, req, res, next) => {
    if (err.name === "UnauthorizedError") {
      return res
        .status(err.status || 401)
        .json({ status: false, message: err.message })
        .end();
    }
    return next(err);
  });

  app.use((err, req, res, next) => {
    return res.status(err.status || 500).json({
      status: false,
      message: err.message,
    });
  });
};
