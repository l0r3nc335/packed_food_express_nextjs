import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import type { UserRepository } from "../repositories/types";
import type { BillingService } from "../services/billing";
import { toSubscriptionSummary } from "../services/subscription-service";
import type { DemoUserSummary } from "../types/product";

export function createMeRoutes(users: UserRepository, billingService: BillingService): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const user = await users.getDemoUser();

      const summary: DemoUserSummary = {
        id: user.id,
        email: user.email,
        name: user.name,
        subscription: toSubscriptionSummary(user.subscription),
      };

      res.json({ user: summary, billingMode: billingService.mode });
    }),
  );

  return router;
}
