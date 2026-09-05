export const LOCALES = ["en", "nl", "de", "fr"] as const;

export type Locale = (typeof LOCALES)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export const DEFAULT_LOCALE: Locale = "en";

/** Per 100 g / 100 ml, as published by Open Food Facts. Any field can be absent. */
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

/** Public product shape. `nutrition` is null whenever `isNutritionLocked` is true. */
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

export type SubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export type SubscriptionSummary = {
  status: SubscriptionStatus;
  isActive: boolean;
  currentPeriodEnd: string | null;
};

export type DemoUserSummary = {
  id: string;
  email: string;
  name: string;
  subscription: SubscriptionSummary;
};
