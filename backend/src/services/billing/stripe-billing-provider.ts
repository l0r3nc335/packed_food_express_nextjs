import Stripe from "stripe";
import { BillingError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import type { BillingEvent, BillingProvider, CheckoutSession, CreateCheckoutInput } from "./types";

export type StripeProviderOptions = {
  secretKey: string;
  priceId: string;
  webhookSecret: string;
  stripe?: Stripe;
};

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function readId(value: unknown): string | null {
  if (typeof value === "string") return value;
  const id = readRecord(value).id;
  return typeof id === "string" ? id : null;
}

function toDate(value: unknown): Date | null {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000) : null;
}

/**
 * Stripe moved `current_period_end` from the subscription onto its items in
 * recent API versions, so both locations are checked.
 */
function readPeriodEnd(subscription: Record<string, unknown>): Date | null {
  const direct = toDate(subscription.current_period_end);
  if (direct) return direct;

  const items = readRecord(subscription.items).data;
  if (!Array.isArray(items) || items.length === 0) return null;

  return toDate(readRecord(items[0]).current_period_end);
}

export function createStripeBillingProvider(options: StripeProviderOptions): BillingProvider {
  const stripe = options.stripe ?? new Stripe(options.secretKey);

  return {
    mode: "stripe",

    async createCheckoutSession({
      user,
      successUrl,
      cancelUrl,
    }: CreateCheckoutInput): Promise<CheckoutSession> {
      let customerId = user.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { demoUserId: user.id },
        });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: options.priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: user.id,
      });

      if (!session.url) {
        throw new BillingError("Stripe did not return a Checkout URL", 502);
      }

      return { id: session.id, url: session.url, stripeCustomerId: customerId };
    },

    parseWebhook(rawBody: Buffer, signature: string | undefined): BillingEvent {
      if (!signature) {
        throw new BillingError("Missing stripe-signature header");
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, options.webhookSecret);
      } catch (error) {
        throw new BillingError("Invalid Stripe webhook signature", 400, { cause: error });
      }

      const object = readRecord(event.data.object);

      switch (event.type) {
        case "checkout.session.completed": {
          return {
            type: "subscription_changed",
            // Checkout only completes once payment succeeded.
            status: "active",
            stripeCustomerId: readId(object.customer),
            stripeSubscriptionId: readId(object.subscription),
            currentPeriodEnd: null,
          };
        }

        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const status =
            typeof object.status === "string"
              ? object.status
              : event.type === "customer.subscription.deleted"
                ? "canceled"
                : "incomplete";

          return {
            type: "subscription_changed",
            status: event.type === "customer.subscription.deleted" ? "canceled" : status,
            stripeCustomerId: readId(object.customer),
            stripeSubscriptionId: readId(object.id),
            currentPeriodEnd: readPeriodEnd(object),
          };
        }

        default: {
          logger.info("Ignoring Stripe event", { eventType: event.type });
          return { type: "ignored", eventType: event.type };
        }
      }
    },
  };
}
