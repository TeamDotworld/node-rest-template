import { PrismaClient } from "@prisma/client";
import Logger from "./logger";
export default (): PrismaClient => {
  const prisma: PrismaClient = new PrismaClient();
  Logger.info("🌎 Prisma loaded");
  return prisma;
};
