import { logger } from "../../lib/logger";
import type { UserRepository } from "../../repositories/types";
import type { BillingEvent, BillingProvider } from "./types";

export type BillingServiceDeps = {
  users: UserRepository;
  provider: BillingProvider;
};

export type StartCheckoutInput = {
  successUrl: string;
  cancelUrl: string;
  apiBaseUrl: string;
};

export type BillingService = {
  readonly mode: BillingProvider["mode"];
  startCheckout(input: StartCheckoutInput): Promise<{ url: string; sessionId: string }>;
  handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<BillingEvent>;
  /** Stub-mode only: flips the demo subscription without contacting Stripe. */
  setStubSubscription(status: "active" | "canceled"): Promise<void>;
};

export function createBillingService(deps: BillingServiceDeps): BillingService {
  return {
    mode: deps.provider.mode,

    async startCheckout({ successUrl, cancelUrl, apiBaseUrl }) {
      const user = await deps.users.getDemoUser();
      const session = await deps.provider.createCheckoutSession({
        user,
        successUrl,
        cancelUrl,
        apiBaseUrl,
      });

      if (session.stripeCustomerId && session.stripeCustomerId !== user.stripeCustomerId) {
        await deps.users.setStripeCustomerId(user.id, session.stripeCustomerId);
      }

      return { url: session.url, sessionId: session.id };
    },

    async handleWebhook(rawBody, signature) {
      const event = deps.provider.parseWebhook(rawBody, signature);
      if (event.type === "ignored") return event;

      // With one demo user we still prefer matching on the Stripe customer so the
      // handler stays correct if more users are ever introduced.
      const matched = event.stripeCustomerId
        ? await deps.users.findByStripeCustomerId(event.stripeCustomerId)
        : null;
      const user = matched ?? (await deps.users.getDemoUser());

      if (event.stripeCustomerId && !user.stripeCustomerId) {
        await deps.users.setStripeCustomerId(user.id, event.stripeCustomerId);
      }

      await deps.users.upsertSubscription(user.id, {
        status: event.status,
        stripeSubscriptionId: event.stripeSubscriptionId,
        currentPeriodEnd: event.currentPeriodEnd,
      });

      logger.info("Applied subscription change from webhook", {
        userId: user.id,
        status: event.status,
      });

      return event;
    },

    async setStubSubscription(status) {
      const user = await deps.users.getDemoUser();
      const currentPeriodEnd =
        status === "active" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

      await deps.users.upsertSubscription(user.id, {
        status,
        stripeSubscriptionId: null,
        currentPeriodEnd,
      });
    },
  };
}
