import type { DemoUser } from "../../repositories/types";

export type CheckoutSession = {
  id: string;
  url: string;
  /** Set when the provider had to create a customer record on the fly. */
  stripeCustomerId: string | null;
};

export type CreateCheckoutInput = {
  user: DemoUser;
  successUrl: string;
  cancelUrl: string;
  /** Public origin of this API; the stub provider redirects back through it. */
  apiBaseUrl: string;
};

export type SubscriptionChangedEvent = {
  type: "subscription_changed";
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
};

export type BillingEvent = SubscriptionChangedEvent | { type: "ignored"; eventType: string };

export type BillingProvider = {
  /** "stripe" once STRIPE_SECRET_KEY is configured, otherwise the local stub. */
  readonly mode: "stripe" | "stub";
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSession>;
  parseWebhook(rawBody: Buffer, signature: string | undefined): BillingEvent;
};
