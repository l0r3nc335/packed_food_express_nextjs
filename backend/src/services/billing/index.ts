import type { Env } from "../../config/env";
import { logger } from "../../lib/logger";
import { createStripeBillingProvider } from "./stripe-billing-provider";
import { createStubBillingProvider } from "./stub-billing-provider";
import type { BillingProvider } from "./types";

/**
 * Stripe is used as soon as a secret key, price and webhook secret are present.
 * Otherwise the app falls back to the local stub so it still runs end to end.
 */
export function createBillingProvider(env: Env): BillingProvider {
  const { STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET } = env;

  if (!STRIPE_SECRET_KEY) {
    return createStubBillingProvider();
  }

  if (!STRIPE_PRICE_ID || !STRIPE_WEBHOOK_SECRET) {
    logger.warn(
      "STRIPE_SECRET_KEY is set but STRIPE_PRICE_ID or STRIPE_WEBHOOK_SECRET is missing; falling back to the stub provider",
    );
    return createStubBillingProvider();
  }

  return createStripeBillingProvider({
    secretKey: STRIPE_SECRET_KEY,
    priceId: STRIPE_PRICE_ID,
    webhookSecret: STRIPE_WEBHOOK_SECRET,
  });
}

export { createStripeBillingProvider } from "./stripe-billing-provider";
export { createStubBillingProvider } from "./stub-billing-provider";
export { createBillingService } from "./billing-service";
export type { BillingService } from "./billing-service";
export type { BillingEvent, BillingProvider } from "./types";
