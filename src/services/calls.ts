import { Inject, Service } from "typedi";
import { Logger } from "winston";
import { Call, Device, PrismaClient } from "@prisma/client";

import { HttpError } from "../api/errors";
import Helper from "../helpers/index";
import mqtt from "../loaders/mqtt";

@Service()
export default class CallsService {
  constructor(
    @Inject("logger") private logger: Logger,
    @Inject("prisma") private prisma: PrismaClient
  ) { }

  public async CreateRoom(name: string, from: string, to: string[]): Promise<string> {
    this.logger.silly("💻 Creating new room");
    const room = Helper.createRoom(name);
    const room_id = (await room).sid
    await this.prisma.call.create({
      data: {
        room_id,
        from,
        to,
      }
    });
    return (await room).sid;
  }

  public async AccessToken(
    room_id: string,
    identity: string
  ): Promise<string> {
    this.logger.silly("💻 Getting access token");
    let token = await Helper.createToken(room_id, identity);
    return token;
  }

  public async Initiate(room_id: string, device: string): Promise<Device> {
    this.logger.silly("💻 Sending MQTT message");
    let isExist = await this.prisma.device.findUnique({
      where: {
        id: device,
      }
    });

    if (!isExist) throw new HttpError(400, "invalid device");
    let token = await Helper.createToken(room_id, device);

    mqtt.sendMessage(`/dotworld/mdm/${isExist.id}`, {
      room_id,
      token
    });

    return isExist;
  }

  public async Disconnect(room_id: string): Promise<Call> {
    this.logger.silly("🔥 Disconnecting room");
    let room = await Helper.closeRoom(room_id);
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

  public async Notification(device: Device): Promise<any[]> {
    this.logger.silly("🔥 Disconnecting room");
    if (device.call_priority === "SECURITY_PHONE") {
      let availableSecurity = await this.prisma.device.findMany({
        where: {
          location_id: device.location_id,
          device_type: "SECURITY_PHONE"
        }
      });

      Helper.notifySecuritys(availableSecurity, device);
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
      Helper.notifyUsers(users, device);
      return users;
    }
  }
}
