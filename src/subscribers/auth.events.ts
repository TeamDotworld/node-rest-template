import { IUser } from "../interface/User";
import { EventSubscriber, On } from "event-dispatch";

import events from "./events";
import { PrismaClient } from "@prisma/client";

import config from "../config";

import sgMail from "@sendgrid/mail";
sgMail.setApiKey(config.sendgrid);

const prisma = new PrismaClient();

@EventSubscriber()
export class UserEventSubscriber {
  @On(events.user.login)
  async onUserLogin(data: { user: IUser; ip: string }) {
    await prisma.user.update({
      where: {
        id: data.user.id,
      },
      data: {
        last_login: new Date(),
        last_ip: data.ip,
      },
    });
  }
}
