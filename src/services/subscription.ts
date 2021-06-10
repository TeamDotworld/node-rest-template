import { Inject, Service } from "typedi";
import { Logger } from "winston";
import { Device, PrismaClient, Subscription } from "@prisma/client";
import { EventDispatcher } from "event-dispatch";

import config from "@config";
import events from "../subscribers/events";
import user from "@api/v1/user";

let eventDispatcher = new EventDispatcher();

const prisma = new PrismaClient();

@Service()
export default class SubscriptionService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async GetSubscriptions(user_id: string): Promise<any[]> {
    this.logger.silly("💻 Listing subscriptions");
    let subscription = await prisma.subscription.findMany({
      where: {
        subscriber_id: user_id,
      },
      select: {
        subscribed_to: {
          select: {
            id: true,
            first_name: true,
            username: true,
          },
        },
      },
    });
    return subscription;
  }

  public async CreateSubscription(
    user_id: string,
    subscribe_to: string
  ): Promise<Subscription> {
    this.logger.silly("💻 Creating subsciption");
    let subscription = await prisma.subscription.create({
      data: {
        subscriber: {
          connect: {
            id: user_id,
          },
        },
        subscribed_to: {
          connect: {
            id: subscribe_to,
          },
        },
      },
      include: {
        subscribed_to: {
          select: {
            id: true,
            first_name: true,
            username: true,
          },
        },
      },
    });
    eventDispatcher.dispatch(events.notification.subscription, subscription);
    return subscription;
  }

  public async RemoveSubscription(
    user_id: string,
    subscribe_to: string
  ): Promise<Subscription> {
    this.logger.silly("💻 removing subsciption");
    let subscription = await prisma.subscription.delete({
      where: {
        Subscriber_Subscribed_to_Constrain: {
          subscriber_id: user_id,
          subscribed_to_id: subscribe_to,
        },
      },
      include: {
        subscribed_to: {
          select: {
            id: true,
            first_name: true,
            username: true,
          },
        },
      },
    });

    return subscription;
  }
}
