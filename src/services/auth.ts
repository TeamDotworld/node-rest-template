import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Logger } from "winston";
import { Inject, Service } from "typedi";
import { PrismaClient } from "@prisma/client";
import { EventDispatcher } from "event-dispatch";
import { differenceInSeconds } from "date-fns";

import config from "../config";
import { IUser, TokenPayload } from "../interface/User";
import events from "../subscribers/events";

let eventDispatcher = new EventDispatcher();

import { HttpError, NotFoundError, UnauthorizedError } from "../api/errors";
import helpers from "../helpers";

@Service()
export default class AuthService {
  constructor(
    @Inject("logger") private logger: Logger,
    @Inject("prisma") private prisma: PrismaClient
  ) {}

  public async Login(
    email: string,
    password: string,
    ip: string | string[] = "unknown"
  ): Promise<{ user: IUser; token: string }> {
    let user = await this.prisma.user.findFirst({
      where: {
        AND: [
          {
            email: email,
          },
          {
            blocked: false,
          },
        ],
      },
    });
    if (!user) {
      throw new UnauthorizedError("Invalid login credentials");
    }
    let same = await bcrypt.compare(password, user.password);
    if (same) {
      let token = helpers.generateLoginToken(user);

      eventDispatcher.dispatch(events.user.login, {
        user: user,
        ip,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`.trim(),
        },
        token: token,
      };
    } else {
      throw new UnauthorizedError("Invalid login credentials");
    }
  }

  public async ResetPassword(email: string): Promise<IUser> {
    let isExist = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!isExist) {
      throw new NotFoundError("User not found");
    }

    const salt = await bcrypt.genSalt(config.seed);
    let tmpPass = Math.random().toString(36).substring(2, 7);
    let password: string = await bcrypt.hash(tmpPass, salt);

    this.logger.warn("Password is %s", tmpPass);

    let user = await this.prisma.user.update({
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

  public async SendMagicLink(email: string): Promise<string> {
    let user = await this.prisma.user.findFirst({
      where: {
        AND: [
          {
            email: email,
          },
          {
            blocked: false,
          },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid login credentials");
    }

    if (user.magic_sent_time) {
      let diff = differenceInSeconds(new Date(), user.magic_sent_time);

      console.log(config.magic.retry - diff);

      if (config.magic.retry - diff > 0) {
        throw new HttpError(
          406,
          `You have requested magic links frequently.Please try after ${
            config.magic.retry - diff
          } seconds`
        );
      }
    }

    var token = jwt.sign({ id: user.id, email: user.email }, config.magic.key, {
      expiresIn: config.magic.expiry,
    });

    eventDispatcher.dispatch(events.notification.magicLink, {
      user,
      token,
    });

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        magic_sent_time: new Date(),
      },
    });

    return user.email;
  }

  public async verifyMagicToken(
    token: string,
    ip: string | string[] = "unknown"
  ): Promise<{ user: IUser; token: string }> {
    try {
      let payload: TokenPayload = helpers.verifyMagicLink(token);
      let user = await this.prisma.user.findFirst({
        where: {
          email: payload.email,
          id: payload.id,
        },
      });

      let newToken = helpers.generateLoginToken(user);
      eventDispatcher.dispatch(events.user.login, {
        user: user,
        ip,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`.trim(),
        },
        token: newToken,
      };
    } catch (err) {
      console.log(err.name);
      if (err.name === "TokenExpiredError")
        throw new HttpError(400, "Magic link expired");
      else if (err.name === "JsonWebTokenError")
        throw new HttpError(400, "Invalid magic link");
      else throw new HttpError(500, err.message);
    }
  }

  public GetPk(): string {
    try {
      return config.keys.public.replace(/\\n/gm, "\n");
    } catch (e) {
      throw new HttpError(503, "Unable to get public key");
    }
  }
}
