import { Inject, Service } from "typedi";
import { Logger } from "winston";
import { Permission, PrismaClient, User } from "@prisma/client";
import { EventDispatcher } from "event-dispatch";

import config from "@config";
import events from "../subscribers/events";
import { PermissionDTO, PermissionUpdateDTO } from "@interface/Permission";

let eventDispatcher = new EventDispatcher();

const prisma = new PrismaClient();

@Service()
export default class PermissionService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async ListPermission(): Promise<Permission[]> {
    this.logger.silly("🤵🤵 Listing permissions");
    let permissions = await prisma.permission.findMany();
    return permissions;
  }

  public async GetPermission(id: string): Promise<Permission | null> {
    this.logger.silly("🤵 Quering permission with id " + id);
    let permission = await prisma.permission.findFirst({
      where: {
        id,
      },
      include: {
        roles: true,
      },
    });
    return permission;
  }

  public async CreatePermission(data: PermissionDTO): Promise<Permission> {
    this.logger.silly("🤵🤵 Create permissions");
    let newPermission = await prisma.permission.create({
      data: data,
    });
    return newPermission;
  }

  public async UpdatePermission(
    id: string,
    data: PermissionUpdateDTO
  ): Promise<Permission> {
    this.logger.silly("🤵🤵 Update permissions");
    let updated = await prisma.permission.update({
      where: {
        id,
      },
      data,
    });
    return updated;
  }

  public async DeletePermission(id: string): Promise<Permission> {
    this.logger.silly("🤵🤵 Deleting permission with id " + id);
    let deleted = await prisma.permission.delete({
      where: {
        id,
      },
    });
    return deleted;
  }
}
