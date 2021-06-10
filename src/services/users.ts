import { Inject, Service } from "typedi";
import { Logger } from "winston";
import { PrismaClient, Role, User } from "@prisma/client";
import { EventDispatcher } from "event-dispatch";

import bcrypt from "bcrypt";
import config from "../config";
import events from "../subscribers/events";
import {
  UserCreateInputDTO,
  UserListDTO,
  UserUpdateDTO,
  UserFcmOutputDTO,
} from "../interface/User";
import { throws } from "assert";
import { use } from "passport";

let eventDispatcher = new EventDispatcher();

const prisma = new PrismaClient();

@Service()
export default class UserService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async ListUsers(): Promise<UserListDTO[]> {
    this.logger.silly("🤵🤵 Listing users");
    let users = await prisma.user.findMany({
      select: {
        id: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        about: true,
        avatar: true,
        email: true,
        phone_number: true,
        username: true,
        created_at: true,
        updated_at: true,
        subscribed_to: {
          select: {
            subscribed_to: {
              select: {
                avatar: true,
                first_name: true,
                username: true,
              },
            },
          },
        },
      },
    });

    return users;
  }

  public async GetUser(id: string): Promise<User> {
    this.logger.silly("🤵 Finding user with id " + id);
    let user = await prisma.user.findFirst({
      where: {
        id,
      },
      include: {
        roles: true,
        _count: {
          select: {
            contents: true,
            devices: true,
            subscribed_to: true,
            subscribers: true,
            likes: true,
          },
        },
      },
    });

    if (user) {
      delete user.password;
      delete user.email_verified;
      delete user.phone_verified;
    } else {
      throw new Error("User not found");
    }

    return user;
  }

  public async GetProfile(user_id: string): Promise<User> {
    this.logger.silly("🤵 Finding profile id " + user_id);
    let user = await prisma.user.findFirst({
      where: {
        id: user_id,
      },
      include: {
        roles: true,
        devices: {
          select: {
            id: true,
            name: true,
            is_live_supported: true,
            status: true,
          },
        },
        _count: {
          select: {
            contents: true,
            devices: true,
            subscribed_to: true,
            subscribers: true,
            likes: true,
          },
        },
      },
    });

    if (user) {
      delete user.password;
      delete user.email_verified;
      delete user.phone_verified;
    } else {
      throw new Error("User not found");
    }

    return user;
  }

  public async CreateUser(user: UserCreateInputDTO): Promise<User> {
    this.logger.silly("🤵 Creating new user");

    let tmpPass = Math.random().toString(36).substring(2, 7);
    const salt = await bcrypt.genSalt(config.seed);
    let hashed: string = await bcrypt.hash(tmpPass, salt);
    user.password = hashed;

    let newUser = await prisma.user.create({
      data: user,
    });

    this.logger.info(
      "Password for user " + newUser.first_name + " is " + tmpPass
    );

    eventDispatcher.dispatch(events.notification.newAccount, {
      ...newUser,
      password: tmpPass,
    });

    return newUser;
  }

  public async UpdateUser(id: string, user: UserUpdateDTO): Promise<User> {
    this.logger.silly("🤵 Update user");

    if (user.password) {
      const salt = await bcrypt.genSalt(config.seed);
      let hashed: string = await bcrypt.hash(user.password, salt);
      user.password = hashed;
    }

    let devices = await prisma.device.findMany({
      where: {
        id: {
          in: user.devices,
        },
      },
      select: {
        id: true,
      },
    });

    let updated = await prisma.user.update({
      where: {
        id: id,
      },
      data: {
        ...user,
        devices: {
          set: devices,
        },
      },
    });

    return updated;
  }

  public async UpdateUserFcm(
    id: string,
    fcm_token: string
  ): Promise<UserFcmOutputDTO> {
    this.logger.silly("🤵 Update user fcm token");

    let updated = await prisma.user.update({
      where: {
        id: id,
      },
      data: {
        fcm_tokens: {
          push: fcm_token,
        },
      },
      select: {
        id: true,
        first_name: true,
      },
    });

    return updated;
  }

  public async UpdateUserRoles(id: string, roles: string[]): Promise<User> {
    this.logger.silly("🤵 Update user role");
    let rs = await prisma.role.findMany({
      where: {
        id: {
          in: roles,
        },
      },
    });

    if (rs.length !== roles.length) {
      throw new Error("Invalid role id's detected. Not saving changes");
    }

    let user = await prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        roles: true,
      },
    });

    if (!user) throw new Error("User not found");

    let updated = await prisma.user.update({
      where: {
        id,
      },
      data: {
        roles: {
          disconnect: user.roles.map((r) => ({ id: r.id })),
          connect: rs.map((r) => ({ id: r.id })),
        },
      },
      include: {
        roles: true,
      },
    });

    delete updated.password;
    delete updated.email_verified;
    delete updated.phone_verified;

    return updated;
  }
}
