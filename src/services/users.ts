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

  public async ListUsers(): Promise<any> {
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
        mobile: true,
        created_at: true,
        updated_at: true,
      },
    });

    return users;
  }
}
