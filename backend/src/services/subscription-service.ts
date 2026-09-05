import type { SubscriptionStatus, SubscriptionSummary } from "../types/product";

export type StoredSubscription = {
  status: string;
  currentPeriodEnd: Date | null;
};

const ACTIVE_STATUSES = new Set<string>(["active", "trialing"]);

const KNOWN_STATUSES = new Set<string>([
  "none",
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
]);

function normalizeStatus(status: string): SubscriptionStatus {
  return KNOWN_STATUSES.has(status) ? (status as SubscriptionStatus) : "none";
}

/**
 * A subscription counts as active only when Stripe says so *and* the paid period
 * has not lapsed. `currentPeriodEnd` may be null for stub/manual activations.
 */
export function isSubscriptionActive(
  subscription: StoredSubscription | null,
  now: Date = new Date(),
): boolean {
  if (!subscription) return false;
  if (!ACTIVE_STATUSES.has(subscription.status)) return false;
  if (subscription.currentPeriodEnd && subscription.currentPeriodEnd.getTime() <= now.getTime()) {
    return false;
  }

  return true;
}

export function toSubscriptionSummary(
  subscription: StoredSubscription | null,
  now: Date = new Date(),
): SubscriptionSummary {
  return {
    status: subscription ? normalizeStatus(subscription.status) : "none",
    isActive: isSubscriptionActive(subscription, now),
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
  };
}
