import { Device, User } from "prisma/prisma-client";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
    device?: Device;
  }
}
