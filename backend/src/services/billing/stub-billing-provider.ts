import { randomUUID } from "node:crypto";
import { logger } from "../../lib/logger";
import type { BillingEvent, BillingProvider, CheckoutSession, CreateCheckoutInput } from "./types";

/**
 * Used when no STRIPE_SECRET_KEY is configured so the app stays fully
 * demonstrable without Stripe credentials. Instead of a hosted Checkout page,
 * the user is redirected to a local endpoint that activates the subscription.
 * Real webhooks are not accepted in this mode.
 */
export function createStubBillingProvider(): BillingProvider {
  return {
    mode: "stub",

    async createCheckoutSession({
      successUrl,
      cancelUrl,
      apiBaseUrl,
    }: CreateCheckoutInput): Promise<CheckoutSession> {
      const url = new URL("/api/billing/stub/complete", apiBaseUrl);
      url.searchParams.set("redirect", successUrl);
      url.searchParams.set("cancel", cancelUrl);

      logger.warn("Stripe keys are not configured; using the stub checkout flow");

      return {
        id: `stub_session_${randomUUID()}`,
        url: url.toString(),
        stripeCustomerId: null,
      };
    },

    parseWebhook(): BillingEvent {
      logger.warn("Received a webhook while Stripe keys are not configured; ignoring it");
      return { type: "ignored", eventType: "stub" };
    },

    async confirmCheckoutSession() {
      // Stub checkout activates via /api/billing/stub/complete before redirect.
      return null;
    },

    async syncCustomerSubscription() {
      return null;
    },
  };
}
