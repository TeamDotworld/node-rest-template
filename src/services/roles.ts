import { Inject, Service } from "typedi";
import { Logger } from "winston";
import { PrismaClient, Role } from "@prisma/client";
import { EventDispatcher } from "event-dispatch";

import config from "../config";
import events from "../subscribers/events";
import { RoleCreateInput } from "../interface/Role";

let eventDispatcher = new EventDispatcher();

const prisma = new PrismaClient();

@Service()
export default class RoleService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async CreateRole(data: RoleCreateInput): Promise<Role> {
    this.logger.silly("🤵🤵 Create permissions");
    if (data.permissions.length == 0) {
      throw new Error("need at least one permission to create a role");
    }

    let perms = await prisma.permission.findMany({
      where: {
        id: {
          in: data.permissions,
        },
      },
    });

    if (data.permissions.length !== perms.length) {
      throw new Error("Invalid permission id's detected. Not saving changes");
    }

    let permissions = data.permissions.map((i) => ({
      id: i,
    }));

    let role = await prisma.role.create({
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
    this.logger.silly("🤵🤵 Listing permissions");
    let roles = await prisma.role.findMany();
    return roles;
  }

  public async GetRole(id: string): Promise<Role | null> {
    this.logger.silly("🤵 Quering permission with id " + id);
    let role = await prisma.role.findFirst({
      where: {
        id,
      },
      include: {
        permissions: true,
      },
    });
    if (!role) throw new Error("Unable to find role");
    return role;
  }

  public async UpdateRole(id: string, data: RoleCreateInput): Promise<Role> {
    this.logger.silly("🤵🤵 update roles");
    if (data.permissions.length == 0) {
      throw new Error("need at least one permission to create a role");
    }

    let perms = await prisma.permission.findMany({
      where: {
        id: {
          in: data.permissions,
        },
      },
    });

    if (data.permissions.length !== perms.length) {
      throw new Error("Invalid permission id's detected. Not saving changes");
    }

    let role = await prisma.role.findUnique({
      where: {
        id,
      },
      include: {
        permissions: true,
      },
    });

    if (!role) throw new Error("Unable to find role");

    let newPermissions = data.permissions
      .filter((p) => role.permissions.some((o) => o.id !== p))
      .map((i) => ({ id: i }));

    let removedPermissions = role.permissions
      .filter((o) => !data.permissions.includes(o.id))
      .map((i) => ({ id: i.id }));

    role.name = data.name || role.name;
    role.description = data.description || role.description;

    let updated = await prisma.role.update({
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
}
