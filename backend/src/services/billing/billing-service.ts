import { logger } from "../../lib/logger";
import type { UserRepository } from "../../repositories/types";
import type { BillingEvent, BillingProvider, SubscriptionChangedEvent } from "./types";

export type BillingServiceDeps = {
  users: UserRepository;
  provider: BillingProvider;
};

export type StartCheckoutInput = {
  successUrl: string;
  cancelUrl: string;
  apiBaseUrl: string;
};

export type ConfirmCheckoutInput = {
  sessionId?: string;
};

export type BillingService = {
  readonly mode: BillingProvider["mode"];
  startCheckout(input: StartCheckoutInput): Promise<{ url: string; sessionId: string }>;
  handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<BillingEvent>;
  /**
   * Activates from a Checkout session id, or syncs from the stored Stripe customer
   * when webhooks never reached the local API.
   */
  confirmCheckout(input?: ConfirmCheckoutInput): Promise<{ applied: boolean; status: string | null }>;
  /** Stub-mode only: flips the demo subscription without contacting Stripe. */
  setStubSubscription(status: "active" | "canceled"): Promise<void>;
};

export function createBillingService(deps: BillingServiceDeps): BillingService {
  async function applySubscriptionChange(event: SubscriptionChangedEvent): Promise<void> {
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

    logger.info("Applied subscription change", {
      userId: user.id,
      status: event.status,
      source: "billing",
    });
  }

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
      await applySubscriptionChange(event);
      return event;
    },

    async confirmCheckout(input = {}) {
      const sessionId = input.sessionId?.trim();
      let event: SubscriptionChangedEvent | null = null;

      if (sessionId) {
        event = await deps.provider.confirmCheckoutSession(sessionId);
      }

      if (!event) {
        const user = await deps.users.getDemoUser();
        if (user.stripeCustomerId) {
          event = await deps.provider.syncCustomerSubscription(user.stripeCustomerId);
        }
      }

      if (!event) {
        return { applied: false, status: null };
      }

      await applySubscriptionChange(event);
      return { applied: true, status: event.status };
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
