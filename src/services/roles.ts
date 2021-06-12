import { Inject, Service } from "typedi";
import { Logger } from "winston";
import { PrismaClient, Role } from "@prisma/client";

import { RoleCreateInput } from "../interface/Role";
import { HttpError } from "../api/errors";

@Service()
export default class RoleService {
  constructor(
    @Inject("logger") private logger: Logger,
    @Inject("prisma") private prisma: PrismaClient
  ) {}

  public async CreateRole(data: RoleCreateInput): Promise<Role> {
    this.logger.silly("🤵🤵 Create roles");
    if (data.permissions.length == 0) {
      throw new HttpError(
        400,
        "need at least one permission selected to create a role"
      );
    }

    let perms = await this.prisma.permission.findMany({
      where: {
        id: {
          in: data.permissions,
        },
      },
    });

    if (data.permissions.length !== perms.length) {
      throw new HttpError(
        400,
        "Invalid permission id's detected. Not saving changes"
      );
    }

    let permissions = data.permissions.map((i) => ({
      id: i,
    }));

    let role = await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: {
          connect: permissions,
        },
      },
      include: {
        permissions: true,
      },
    });

    return role;
  }

  public async ListRoles(): Promise<Role[]> {
    this.logger.silly("🤵🤵 Listing roles");
    let roles = await this.prisma.role.findMany();
    return roles;
  }

  public async GetRole(id: string): Promise<Role> {
    this.logger.silly("🤵 Quering role with id " + id);
    let role = await this.prisma.role.findFirst({
      where: {
        id,
      },
      include: {
        permissions: true,
      },
    });
    if (!role) throw new HttpError(400, "Role not found for given id");
    return role;
  }

  public async UpdateRole(id: string, data: RoleCreateInput): Promise<Role> {
    this.logger.silly("🤵🤵 Update roles");
    if (data.permissions.length == 0) {
      throw new HttpError(
        400,
        "need at least one permission selected to update a role"
      );
    }

    let perms = await this.prisma.permission.findMany({
      where: {
        id: {
          in: data.permissions,
        },
      },
    });

    if (data.permissions.length !== perms.length) {
      throw new HttpError(
        400,
        "Invalid permission id's detected. Not saving changes"
      );
    }

    let role = await this.prisma.role.findUnique({
      where: {
        id,
      },
      include: {
        permissions: true,
      },
    });

    if (!role) throw new HttpError(404, "Unable to find role");

    let newPermissions = data.permissions
      .filter((p) => role.permissions.some((o) => o.id !== p))
      .map((i) => ({ id: i }));

    let removedPermissions = role.permissions
      .filter((o) => !data.permissions.includes(o.id))
      .map((i) => ({ id: i.id }));

    role.name = data.name || role.name;
    role.description = data.description || role.description;

    let updated = await this.prisma.role.update({
      where: {
        id,
      },
      data: {
        ...role,
        permissions: {
          connect: newPermissions,
          disconnect: removedPermissions,
        },
      },
      include: {
        permissions: true,
      },
    });

    return updated;
  }

  public async DeleteRole(id: string): Promise<Role> {
    this.logger.silly("🤵🤵 Delete a role");
    let deleted = await this.prisma.role.delete({
      where: {
        id,
      },
    });
    return deleted;
  }
}
