import { PrismaClient } from "@prisma/client";
import { DEMO_USER } from "../src/config/demo-user";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: { name: DEMO_USER.name },
    create: { email: DEMO_USER.email, name: DEMO_USER.name },
  });

  // Starts unsubscribed so the paywall is visible on a fresh install.
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, status: "none" },
  });

  console.log(`Seeded demo user ${user.email} (${user.id})`);
}

main()
  .catch((error: unknown) => {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
