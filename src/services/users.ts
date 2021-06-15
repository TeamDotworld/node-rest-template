import { Inject, Service } from "typedi";
import { Logger } from "winston";
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
import { HttpError, NotFoundError } from "../api/errors";
import { Authenticator, PrismaClient, User, WebAuthn } from "@prisma/client";

let eventDispatcher = new EventDispatcher();

@Service()
export default class UserService {
  constructor(
    @Inject("logger") private logger: Logger,
    @Inject("prisma") private prisma: PrismaClient
  ) {}

  public async ListUsers(): Promise<UserListDTO[]> {
    this.logger.silly("🤵🤵 Listing users");
    let users = await this.prisma.user.findMany({
      select: {
        id: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        about: true,
        avatar: true,
        email: true,
        mobile: true,
        country_code: true,
        created_at: true,
        updated_at: true,
      },
    });

    return users;
  }

  public async GetUser(id: string): Promise<
    User & {
      authenticator: Authenticator;
    }
  > {
    this.logger.silly("🤵 Finding user with id " + id);
    let user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        authenticator: true,
      },
    });

    if (user) {
      delete user.password;
      delete user.email_verified;
      delete user.mobile_verified;
    } else {
      throw new HttpError(404, "User not found");
    }

    return user;
  }

  public async GetUserByEmail(email: string): Promise<
    User & {
      authenticator: Authenticator;
    }
  > {
    this.logger.silly("🤵 Finding user with email " + email);
    let user = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
      include: {
        authenticator: true,
      },
    });

    if (user) {
      delete user.password;
      delete user.email_verified;
      delete user.mobile_verified;
    } else {
      throw new HttpError(404, "User not found");
    }

    return user;
  }

  public async GetProfile(user_id: string): Promise<User> {
    this.logger.silly("🤵 Finding profile id " + user_id);
    let user = await this.prisma.user.findFirst({
      where: {
        id: user_id,
      },
      include: {
        roles: true,
      },
    });

    if (user) {
      delete user.password;
      delete user.email_verified;
      delete user.mobile_verified;
    } else {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  public async CreateUser(user: UserCreateInputDTO): Promise<User> {
    this.logger.silly("🤵 Creating new user");

    let tmpPass = Math.random().toString(36).substring(2, 7);
    const salt = await bcrypt.genSalt(config.seed);
    let hashed: string = await bcrypt.hash(tmpPass, salt);
    user.password = hashed;

    let newUser = await this.prisma.user.create({
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

    let updated = await this.prisma.user.update({
      where: {
        id: id,
      },
      data: {
        ...user,
      },
    });

    return updated;
  }

  public async UpdateUserFcm(
    id: string,
    fcm_token: string
  ): Promise<UserFcmOutputDTO> {
    this.logger.silly("🤵 Update user fcm token");

    let updated = await this.prisma.user.update({
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
    let rs = await this.prisma.role.findMany({
      where: {
        id: {
          in: roles,
        },
      },
    });

    if (rs.length !== roles.length) {
      throw new HttpError(
        400,
        "Invalid role id's detected. Not saving changes"
      );
    }

    let user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        roles: true,
      },
    });

    if (!user) throw new HttpError(404, "User not found");

    let updated = await this.prisma.user.update({
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
    delete updated.mobile_verified;

    return updated;
  }

  public async SaveUserChallenge(
    user_id: string,
    challenge: string
  ): Promise<User> {
    this.logger.silly("🤵 Update authentication data");

    let created = await this.prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        fido_challenge: challenge,
      },
    });

    return created;
  }

  public async CreateWebAuthnData(
    user_id: string,
    name: string,
    credentialID: string,
    credentialPublicKey: string,
    counter: number,
    _data: object,
    fmt: string = "unknown"
  ): Promise<WebAuthn> {
    this.logger.silly("🤵 Update authentication data");

    let created = await this.prisma.webAuthn.create({
      data: {
        name,
        counter: counter,
        credentialID: credentialID,
        credentialPublicKey: credentialPublicKey,
        registered: true,
        fmt,
        user: {
          connect: {
            id: user_id,
          },
        },
      },
    });

    return created;
  }

  public async GetWebAuthn(user_id: string): Promise<WebAuthn[]> {
    this.logger.silly("🤵 Getting authenticator data");

    let data = await this.prisma.user.findUnique({
      where: {
        id: user_id,
      },
      select: {
        fido_devices: true,
      },
    });

    return data.fido_devices;
  }

  public async UpdateWebAuthnCounter(
    auth_id: string,
    counter: number
  ): Promise<WebAuthn> {
    this.logger.silly("🤵 Getting authenticator data");

    let data = await this.prisma.webAuthn.update({
      where: {
        id: auth_id,
      },
      data: {
        counter: counter,
      },
    });

    return data;
  }

  public async CreateAuthenticatorData(
    secret: string,
    user_id: string
  ): Promise<Authenticator> {
    this.logger.silly("🤵 Getting authenticator data");

    let data = await this.prisma.authenticator.create({
      data: {
        secret,
        enabled: true,
        verified: true,
        valid_till: new Date(),
        user: {
          connect: {
            id: user_id,
          },
        },
      },
    });

    return data;
  }

  public async RemoveAuthenticatorData(
    user_id: string
  ): Promise<Authenticator> {
    this.logger.silly("🤵 Getting authenticator data");

    let data = await this.prisma.authenticator.delete({
      where: {
        user_id,
      },
    });

    return data;
  }
}
