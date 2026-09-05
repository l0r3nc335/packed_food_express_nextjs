import express, { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import type { BillingService } from "../services/billing";

/**
 * Mounted before express.json() because Stripe signature verification needs the
 * exact raw bytes; a re-serialized JSON body would fail the HMAC check.
 */
export function createStripeWebhookRoutes(billingService: BillingService): Router {
  const router = Router();

  router.post(
    "/",
    express.raw({ type: "application/json" }),
    asyncHandler(async (req, res) => {
      const signature = req.header("stripe-signature");
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");

      const event = await billingService.handleWebhook(rawBody, signature);

      res.json({ received: true, handled: event.type !== "ignored" });
    }),
  );

  return router;
}
