import { Inject, Service } from "typedi";
import { Logger } from "winston";
import { Permission, PrismaClient } from "@prisma/client";

import { PermissionDTO, PermissionUpdateDTO } from "../interface/Permission";
import { NotFoundError } from "../api/errors";

@Service()
export default class PermissionService {
  constructor(
    @Inject("logger") private logger: Logger,
    @Inject("prisma") private prisma: PrismaClient
  ) {}

  public async ListPermission(): Promise<Permission[]> {
    this.logger.silly("🤵🤵 Listing permissions");
    let permissions = await this.prisma.permission.findMany();
    return permissions;
  }

  public async GetPermission(id: string): Promise<Permission | null> {
    this.logger.silly("🤵 Quering permission with id " + id);
    let permission = await this.prisma.permission.findFirst({
      where: {
        id,
      },
      include: {
        roles: true,
      },
    });
    if (!permission) throw new NotFoundError("Permision not found");
    return permission;
  }

  public async CreatePermission(data: PermissionDTO): Promise<Permission> {
    this.logger.silly("🤵🤵 Create permissions");
    let newPermission = await this.prisma.permission.create({
      data: data,
    });
    return newPermission;
  }

  public async UpdatePermission(
    id: string,
    data: PermissionUpdateDTO
  ): Promise<Permission> {
    this.logger.silly("🤵🤵 Update permissions");
    let updated = await this.prisma.permission.update({
      where: {
        id,
      },
      data,
    });
    return updated;
  }

  public async DeletePermission(id: string): Promise<Permission> {
    this.logger.silly("🤵🤵 Deleting permission with id " + id);
    let deleted = await this.prisma.permission.delete({
      where: {
        id,
      },
    });
    return deleted;
  }
}
