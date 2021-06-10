import { IUser } from "@interface/User";
import { EventSubscriber, On } from "event-dispatch";

import events from "./events";

@EventSubscriber()
export class NotificationEventSubscriber {
  @On(events.notification.forgetPassword)
  async onForgetPassword(data: IUser) {
    console.log("New password is " + data.password);
  }
}
