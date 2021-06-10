const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
import { Request, Response, NextFunction } from "express";

import { PrismaClient, User } from "@prisma/client";
import { PassportStatic } from "passport";
import { StrategyOptions } from "passport-jwt";

import { Logger } from "winston";
import { Container } from "typedi";
import { UnauthorizedError } from "../../services/auth";
import config from "../../config";

var opts: StrategyOptions = {
  secretOrKey: config.keys.public.replace(/\\n/gm, "\n"),
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  algorithms: ["RS256"],
};

const prisma = new PrismaClient();

export function auth(passport: PassportStatic) {
  passport.use(
    new JwtStrategy(opts, async function (jwt_payload, done) {
      try {
        let user = await prisma.user.findFirst({
          where: {
            AND: [
              {
                id: jwt_payload.id,
              },
              {
                blocked: false,
              },
            ],
          },
          include: {
            devices: true,
          },
        });
        if (user) {
          delete user.blocked;
          delete user.password;
          return done(null, JSON.parse(JSON.stringify(user)));
        } else {
          return done(null, false, { message: "invalid token" });
        }
      } catch (err) {
        return done(err, false);
      }
    })
  );
}

export const checkRole =
  (needRole: string) => async (req, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get("logger");
    try {
      const { user } = req;

      logger.info("Need role : " + needRole);

      let existing = await prisma.user.findFirst({
        where: {
          AND: [
            {
              id: user.id,
            },
            {
              roles: {
                some: {
                  permissions: {
                    some: {
                      OR: [
                        {
                          name: needRole,
                        },
                        {
                          name: "*",
                        },
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
      });
      if (existing) {
        next();
      } else {
        throw new UnauthorizedError(
          "You don't have access to this resource",
          403
        );
      }
    } catch (e) {
      logger.error("🔥 User don't have role for this operation");
      return res.status(403).json({
        message: e.message,
      });
    }
  };

export const validateDevice =
  () => async (req, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get("logger");
    try {
      let { id: device_id } = req.params;
      let { device_token } = req.query;

      let device = await prisma.device.findFirst({
        where: {
          id: device_id,
          token: device_token,
        },
      });

      if (!device) {
        throw new Error("Unauthorized");
      }
      req.device = device;

      next();
    } catch (e) {
      logger.error("🔥 This device is not allowed");
      logger.error(e);
      return res.status(403).json({
        message: e.message,
      });
    }
  };
