import { PrismaClient } from "@prisma/client";

export default (): PrismaClient => {
  const prisma: PrismaClient = new PrismaClient();
  return prisma;
};
