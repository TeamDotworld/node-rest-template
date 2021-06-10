import { Inject, Service } from "typedi";
import { Logger } from "winston";
import { PrismaClient } from "@prisma/client";
import { EventDispatcher } from "event-dispatch";

import config from "@config";
import { IUser } from "../interface/User";
import events from "../subscribers/events";

let eventDispatcher = new EventDispatcher();

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import permissions from "../config/permissions";

const prisma = new PrismaClient();

export class UnauthorizedError extends Error {
  status = 500;
  constructor(message = "user not authorised", status = 401, ...params) {
    super(...params);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnauthorizedError);
    }
    this.message = message;
    this.status = status;
  }
}

@Service()
export default class AuthService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async SignIn(
    email: string,
    password: string,
    ip: string | string[] = "unknown",
    super_admin: boolean = false
  ): Promise<{ user: IUser; token: string }> {
    let user = super_admin
      ? await prisma.user.findFirst({
          where: {
            AND: [
              {
                email: email,
              },
              {
                roles: {
                  some: {
                    permissions: {
                      some: {
                        name: permissions.admin.super,
                      },
                    },
                  },
                },
              },
            ],
          },
        })
      : await prisma.user.findUnique({
          where: {
            email: email,
          },
        });

    if (!user) {
      throw new UnauthorizedError("Invalid credentials", 401);
    }
    let same = await bcrypt.compare(password, user.password);
    if (same) {
      var privateKey = config.keys.private.replace(/\\n/gm, "\n");

      var token = jwt.sign({ id: user.id }, privateKey, {
        expiresIn: "3d",
        algorithm: "RS256",
      });

      let userResp = {
        id: user.id,
        name: user.first_name,
        email: user.email,
      };

      eventDispatcher.dispatch(events.user.login, { user: userResp, ip });

      return {
        user: userResp,
        token: token,
      };
    } else {
      throw new UnauthorizedError("Invalid credentials", 401);
    }
  }

  public async ResetPassword(email: string): Promise<IUser> {
    let tmpPass = Math.random().toString(36).substring(2, 7);

    this.logger.warn("Password is %s", tmpPass);

    const salt = await bcrypt.genSalt(config.seed);
    let password: string = await bcrypt.hash(tmpPass, salt);

    let user = await prisma.user.update({
      where: {
        email: email,
      },
      data: {
        password,
        last_password_reset: new Date(),
      },
    });

    eventDispatcher.dispatch(events.notification.forgetPassword, {
      ...user,
      password: tmpPass,
    });

    return {
      id: user.id,
      name: user.first_name,
      email: user.email,
    };
  }

  public GetPk(): string {
    return config.keys.public.replace(/\\n/gm, "\n");
  }
}
