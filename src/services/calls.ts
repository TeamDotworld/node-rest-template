import { Inject, Service } from "typedi";
import { Logger } from "winston";
import { Call, Device, PrismaClient } from "@prisma/client";

import { HttpError } from "../api/errors";
import helper from "../helpers/index";
import mqtt from "../loaders/mqtt";
import bullmq from "../loaders/bullmq";

@Service()
export default class CallsService {
  constructor(
    @Inject("logger") private logger: Logger,
    @Inject("prisma") private prisma: PrismaClient
  ) { }

  public async CreateRoom(name: string, from: string, to: string): Promise<Call> {
    this.logger.silly("💻 Creating new room");
    const room = await helper.createRoom(name);
    const room_id = room.sid
    const call = await this.prisma.call.create({
      data: {
        room_id,
        from,
        to,
      }
    });
    let token = await helper.createToken(room_id, to);
    mqtt.sendMessage(`/dotworld/mdm/${to}`, {
      room_id,
      token
    });
    return call;
  }

  public async GetAccessToken(
    room_id: string,
    identity: string
  ): Promise<string> {
    this.logger.silly("💻 Getting access token");
    let token = await helper.createToken(room_id, identity);
    return token;
  }

  public async AddParticipant(room_id: string, device: string): Promise<Device> {
    this.logger.silly("💻 Sending MQTT message");
    let isExist = await this.prisma.device.findUnique({
      where: {
        id: device,
      }
    });

    if (!isExist) throw new HttpError(400, "invalid device");
    let token = await helper.createToken(room_id, device);

    mqtt.sendMessage(`/dotworld/mdm/${device}`, {
      room_id,
      token
    });

    await this.prisma.call.update({
      where: {
        room_id
      },
      data: {
        to: {
          push: device
        }
      }
    })

    return isExist;
  }

  public async DisconnectRoom(room_id: string): Promise<Call> {
    this.logger.silly("🔥 Disconnecting room");
    let room = await helper.closeRoom(room_id);
    let callLog = await this.prisma.call.update({
      where: {
        room_id
      },
      data: {
        duration: room.duration,
        end_time: room.endTime,
        status: "COMPLETED"
      }
    })
    return callLog;
  }

  //todo- remove
  public async Notification(device: Device): Promise<any[]> {
    this.logger.silly("🔥 Disconnecting room");
    if (device.call_priority === "SECURITY_PHONE") {
      let availableSecurity = await this.prisma.device.findMany({
        where: {
          location_id: device.location_id,
          device_type: "SECURITY_PHONE"
        }
      });

      await bullmq.sosQueue.add(device.id + Date.now(), { list: availableSecurity, device });
      return availableSecurity;

    } else {
      let users = await this.prisma.location.findMany({
        where: {
          id: device.location_id
        },
        select: {
          users: {
            select: {
              id: true,
              email: true,
              fcm_tokens: true
            }
          }
        }
      });
      await bullmq.sosQueue.add(device.id + Date.now(), { list: users, device });
      return users;
    }
  }
}
