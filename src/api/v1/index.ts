import { UserController } from "./admin/UserController";
import { RoleController } from "./admin/RoleController";
import { PermissionController } from "./admin/PermissionController";

import { AuthController } from "./AuthController";

let controllers = [
  UserController,
  AuthController,
  RoleController,
  PermissionController,
];

export default controllers;
