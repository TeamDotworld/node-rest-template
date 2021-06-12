import { Inject, Service } from "typedi";
import { Logger } from "winston";
import { Device, PrismaClient } from "@prisma/client";

import { IDevice } from "../interface/Device";
import { NotFoundError } from "../api/errors";

@Service()
export default class DeviceService {
  constructor(
    @Inject("logger") private logger: Logger,
    @Inject("prisma") private prisma: PrismaClient
  ) {}

  public async ListDevices(): Promise<Device[]> {
    this.logger.silly("💻 Listing devices");
    let devices = await this.prisma.device.findMany();
    return devices;
  }

  public async GetDevice(id: string): Promise<Device> {
    this.logger.silly("💻 Finding device with id " + id);
    let device = await this.prisma.device.findUnique({
      where: {
        id,
      },
    });
    if (!device) {
      throw new NotFoundError("Device not found");
    }
    return device;
  }

  public async CreateDevice(device: IDevice): Promise<Device> {
    this.logger.silly("💻 Creating new device");

    let newDevice = await this.prisma.device.upsert({
      where: {
        id: device.id,
      },
      create: {
        ...device,
      },
      update: {
        name: device.name,
      },
    });

    return newDevice;
  }

  public async UpdateDevice(
    device_id: string,
    device: IDevice
  ): Promise<Device> {
    this.logger.silly("💻 Creating new device");
    let updated = await this.prisma.device.update({
      where: {
        id: device_id,
      },
      data: {
        blocked: device.blocked,
        name: device.name,
      },
    });
    return updated;
  }

  public async DeleteDevice(device_id: string): Promise<Device> {
    this.logger.silly("🔥 Deleting new device");
    let deleted = await this.prisma.device.delete({
      where: {
        id: device_id,
      },
    });
    return deleted;
  }
}
