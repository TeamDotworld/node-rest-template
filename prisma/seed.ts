require("dotenv").config();

import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

const userData: Prisma.UserCreateInput[] = [
  {
    email: "naveen@dotworld.in",
    first_name: "Naveen",
    last_name: "Sakthivel",
    last_ip: "127.0.0.1",
    password: "$2b$12$F1sPCsTGNYinni1gW5HE5OTSbj9fBxmR2PTNsBSoerfoHHZWfsoiC",
    email_verified: true,
    roles: {
      create: {
        name: "Super Admin",
        description: "Role has access to all resources",
        permissions: {
          create: {
            name: "super.admin",
            description: "Permission has access to all resources",
            route: "*",
          },
        },
      },
    },
  },
];

async function main() {
  console.log(`Start seeding ...`);

  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: {
        email: u.email,
      },
      update: {},
      create: u,
    });
    console.log(`Created user with id: ${user.id}`);
  }
  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
