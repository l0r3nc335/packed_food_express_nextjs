import type { Locale } from "../i18n/config";

/**
 * API contract mirrored from the Express backend. It is duplicated on purpose:
 * the frontend must never import backend modules.
 */
export type NutritionFacts = {
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  proteins: number | null;
  salt: number | null;
  servingSize: string | null;
  nutriScore: string | null;
};

export type Product = {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  categories: string | null;
  isNutritionLocked: boolean;
  nutrition: NutritionFacts | null;
};

export type SearchResult = {
  query: string;
  locale: Locale;
  count: number;
  isSubscribed: boolean;
  products: Product[];
};

export type RecentSearch = {
  id: string;
  term: string;
  locale: Locale;
  resultCount: number;
  createdAt: string;
};

export type SubscriptionSummary = {
  status: string;
  isActive: boolean;
  currentPeriodEnd: string | null;
};

export type DemoUserSummary = {
  id: string;
  email: string;
  name: string;
  subscription: SubscriptionSummary;
};

export type BillingMode = "stripe" | "stub";

export type MeResponse = {
  user: DemoUserSummary;
  billingMode: BillingMode;
};

export type ApiErrorBody = {
  error: { code: string; message: string };
};
