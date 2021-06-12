import { User } from ".prisma/client";
import { EventSubscriber, On } from "event-dispatch";

import config from "../config";
import sgMail from "@sendgrid/mail";
sgMail.setApiKey(config.sendgrid);

import events from "./events";
import { IUser } from "../interface/User";

@EventSubscriber()
export class NotificationEventSubscriber {
  @On(events.notification.forgetPassword)
  async onForgetPassword(user: IUser) {
    try {
      console.log("New password is " + user.password);
      const msg = {
        to: `${user.email}`, // Change to your recipient
        from: "no-reply@dotworld.dev",
        subject: "Welcome to Nodejs Template",
        text: `Your account password reset success. Please use password ${user.password} to login. URL: https://beambox-user-stage.web.app/`,
        html: `Your account password reset success. Please use password ${user.password} to login. URL: https://beambox-user-stage.web.app/`,
      };

      sgMail
        .send(msg)
        .then((response) => {
          console.log(response[0].statusCode);
        })
        .catch((error) => {
          console.error(error);
        });
    } catch (e) {
      console.log(e);
    }
  }

  @On(events.notification.magicLink)
  async onMagicLinkRequest({ user, token }: { user: User; token: string }) {
    try {
      console.log("Sending magic link to " + user.email);
      const msg = {
        to: `${user.email}`, // Change to your recipient
        from: "no-reply@dotworld.dev",
        subject: "Magic Link request",
        text: `Hi ${user.first_name} \nPlease use link ${config.magic.link}?token=${token} to login.`,
        html: `Hi ${user.first_name} <br/>Please use link ${config.magic.link}?token=${token} to login.`,
      };

      sgMail
        .send(msg)
        .then((response) => {
          console.log(response[0].statusCode);
        })
        .catch((error) => {
          console.error(error);
        });
    } catch (e) {
      console.log(e);
    }
  }

  @On(events.notification.newAccount)
  async onNewAccountCreated(user: User) {
    try {
      console.log("New password is " + user.password);
      const msg = {
        to: `${user.email}`, // Change to your recipient
        from: "no-reply@dotworld.dev",
        subject: "Welcome to Nodejs Template",
        text: `Your password reset is success. Please use password ${user.password} to login.`,
        html: `Your password reset is successfully. Please use password ${user.password} to login.`,
      };

      sgMail
        .send(msg)
        .then((response) => {
          console.log(response[0].statusCode);
        })
        .catch((error) => {
          console.error(error);
        });
    } catch (e) {
      console.log(e);
    }
  }
}
