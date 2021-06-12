import { IsEmail, IsUUID, MinLength } from "class-validator";

export class RoleDTO {
  name: string;
  description: string | null;
  permissions: string[];
}

export class PermissionDTO {
  name: string;
  description: string | null;
  route: string;
}
