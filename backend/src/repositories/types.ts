import type { Locale, RecentSearch } from "../types/product";

export type StoredSubscriptionRecord = {
  status: string;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
};

export type DemoUser = {
  id: string;
  email: string;
  name: string;
  stripeCustomerId: string | null;
  subscription: StoredSubscriptionRecord | null;
};

export type SubscriptionUpsert = {
  status: string;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
};

/**
 * Repositories keep Prisma out of the services, which lets the tests run against
 * in-memory fakes without a live MySQL instance.
 */
export type UserRepository = {
  getDemoUser(): Promise<DemoUser>;
  findByStripeCustomerId(stripeCustomerId: string): Promise<DemoUser | null>;
  setStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void>;
  upsertSubscription(userId: string, data: SubscriptionUpsert): Promise<void>;
};

export type SearchRecordInput = {
  userId: string;
  term: string;
  locale: Locale;
  resultCount: number;
};

export type SearchRepository = {
  record(input: SearchRecordInput): Promise<void>;
  recent(userId: string, limit: number): Promise<RecentSearch[]>;
};
