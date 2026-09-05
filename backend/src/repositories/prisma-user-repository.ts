import type { PrismaClient } from "@prisma/client";
import { DEMO_USER } from "../config/demo-user";
import type { DemoUser, SubscriptionUpsert, UserRepository } from "./types";

type UserRow = {
  id: string;
  email: string;
  name: string;
  stripeCustomerId: string | null;
  subscription: {
    status: string;
    stripeSubscriptionId: string | null;
    currentPeriodEnd: Date | null;
  } | null;
};

function toDemoUser(row: UserRow): DemoUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    stripeCustomerId: row.stripeCustomerId,
    subscription: row.subscription
      ? {
          status: row.subscription.status,
          stripeSubscriptionId: row.subscription.stripeSubscriptionId,
          currentPeriodEnd: row.subscription.currentPeriodEnd,
        }
      : null,
  };
}

export function createPrismaUserRepository(prisma: PrismaClient): UserRepository {
  return {
    /** Upsert keeps the demo working even if the seed was never run. */
    async getDemoUser(): Promise<DemoUser> {
      const user = await prisma.user.upsert({
        where: { email: DEMO_USER.email },
        update: {},
        create: {
          email: DEMO_USER.email,
          name: DEMO_USER.name,
          subscription: { create: { status: "none" } },
        },
        include: { subscription: true },
      });

      return toDemoUser(user);
    },

    async findByStripeCustomerId(stripeCustomerId: string): Promise<DemoUser | null> {
      const user = await prisma.user.findUnique({
        where: { stripeCustomerId },
        include: { subscription: true },
      });

      return user ? toDemoUser(user) : null;
    },

    async setStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
      await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId } });
    },

    async upsertSubscription(userId: string, data: SubscriptionUpsert): Promise<void> {
      await prisma.subscription.upsert({
        where: { userId },
        update: {
          status: data.status,
          stripeSubscriptionId: data.stripeSubscriptionId ?? null,
          currentPeriodEnd: data.currentPeriodEnd ?? null,
        },
        create: {
          userId,
          status: data.status,
          stripeSubscriptionId: data.stripeSubscriptionId ?? null,
          currentPeriodEnd: data.currentPeriodEnd ?? null,
        },
      });
    },
  };
}
