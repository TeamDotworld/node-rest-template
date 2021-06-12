import { Inject, Service } from "typedi";
import { Logger } from "winston";
import { Device, PrismaClient } from "@prisma/client";
import { EventDispatcher } from "event-dispatch";

import config from "../config";
import events from "../subscribers/events";
import { IDevice } from "../interface/Device";

let eventDispatcher = new EventDispatcher();

const prisma = new PrismaClient();

@Service()
export default class DeviceService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async ListDevices(): Promise<Device[]> {
    this.logger.silly("💻 Listing devices");
    let devices = await prisma.device.findMany();
    return devices;
  }

  public async GetDevice(id: string): Promise<Device> {
    this.logger.silly("💻 Finding device with id " + id);
    let device = await prisma.device.findUnique({
      where: {
        id,
      },
    });
    if (!device) {
      throw new Error("Device not found");
    }
    return device;
  }

  public async CreateDevice(device: IDevice): Promise<Device> {
    this.logger.silly("💻 Creating new device");

    let newDevice = await prisma.device.upsert({
      where: {
        id: device.id,
      },
      create: {
        ...device,
      },
      update: {
        name: device.name,
        is_live_supported: device.is_live_supported,
      },
    });

    return newDevice;
  }

  public async UpdateDevice(
    device_id: string,
    device: IDevice
  ): Promise<Device> {
    this.logger.silly("💻 Creating new device");
    let updated = await prisma.device.update({
      where: {
        id: device_id,
      },
      data: {
        blocked: device.blocked,
        name: device.name,
        is_live_supported: device.is_live_supported,
      },
    });
    return updated;
  }

  public async DeleteDevice(device_id: string): Promise<Device> {
    this.logger.silly("🔥 Deleting new device");
    let deleted = await prisma.device.delete({
      where: {
        id: device_id,
      },
    });
    return deleted;
  }
}
