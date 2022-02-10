const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
import { NextFunction,Request,Response } from "express";

import { PrismaClient,Status } from "@prisma/client";
import { PassportStatic } from "passport";
import { StrategyOptions } from "passport-jwt";

import { Logger } from "winston";
import { Container } from "typedi";
import config from "../config";
import { HttpError,UnauthorizedError,BadRequestError } from "../api/errors";

var opts: StrategyOptions = {
  secretOrKey: config?.keys?.public?.replace(/\\n/gm, "\n"),
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
  (needRole: string) => async (req, _, next: NextFunction) => {
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
              OR: [
                {
                  roles: {
                    some: {
                      permissions: {
                        some: {
                          OR: [
                            {
                              name: needRole,
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      });
      if (existing) {
        next();
      } else {
        throw new HttpError(403, "You don't have access to this resource");
      }
    } catch (e) {
      logger.error("🔥 User don't have role for this operation");
      throw e;
    }
  };

  export const validateDevice = async (
    req: Request,
    _: Response,
    next: NextFunction
  ) => {
    const logger: Logger = Container.get("logger");
    logger.info(`🤖 Authenticating device`);
    try {
      var access = req.headers.authorization;
      if (!access) throw new UnauthorizedError("Unauthorized");
  
      let data = Buffer.from(access.split(" ")[1], "base64").toString();
      if (!data) throw new BadRequestError("Bad request");
  
      let [id, token] = data.split(":");
      if (!id || !token) {
        throw new BadRequestError("Invalid authorization");
      }
  
      let device = await prisma.device.findFirst({
        where: {
          AND: [{ id: id }, { token: token }, { blocked: false }],
        },
      });
      if (!device) {
        throw new HttpError(401, "Unauthorized");
      }
  
      if (device.status === Status.OFFLINE) {
        await prisma.device.update({
          where: { id: device.id },
          data: {
            status: Status.ONLINE,
          },
        });
      }
      req.device = device;
  
      next();
    } catch (e) {
      logger.error("🔥 This device is not allowed");
      next(e);
    }
  };
