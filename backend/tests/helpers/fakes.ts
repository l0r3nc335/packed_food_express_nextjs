import type {
  DemoUser,
  SearchRecordInput,
  SearchRepository,
  SubscriptionUpsert,
  UserRepository,
} from "../../src/repositories/types";
import type { OffClient, OffSearchParams } from "../../src/services/off-client";
import type { OffProduct } from "../../src/services/off-types";
import { dedupeRecentSearches, type RecentSearchRow } from "../../src/services/recent-searches";

export type FakeUserRepository = UserRepository & {
  user: DemoUser;
  upserts: SubscriptionUpsert[];
};

export function createFakeUserRepository(overrides: Partial<DemoUser> = {}): FakeUserRepository {
  const user: DemoUser = {
    id: "user_demo",
    email: "demo@example.com",
    name: "Demo User",
    stripeCustomerId: null,
    subscription: null,
    ...overrides,
  };

  const upserts: SubscriptionUpsert[] = [];

  return {
    user,
    upserts,
    async getDemoUser() {
      return user;
    },
    async findByStripeCustomerId(stripeCustomerId) {
      return user.stripeCustomerId === stripeCustomerId ? user : null;
    },
    async setStripeCustomerId(_userId, stripeCustomerId) {
      user.stripeCustomerId = stripeCustomerId;
    },
    async upsertSubscription(_userId, data) {
      upserts.push(data);
      user.subscription = {
        status: data.status,
        stripeSubscriptionId: data.stripeSubscriptionId ?? null,
        currentPeriodEnd: data.currentPeriodEnd ?? null,
      };
    },
  };
}

export type FakeSearchRepository = SearchRepository & {
  records: SearchRecordInput[];
  failOnRecord: boolean;
};

export function createFakeSearchRepository(): FakeSearchRepository {
  const records: SearchRecordInput[] = [];

  const repository: FakeSearchRepository = {
    records,
    failOnRecord: false,
    async record(input) {
      if (repository.failOnRecord) {
        throw new Error("database unavailable");
      }
      records.push(input);
    },
    async recent(_userId, limit) {
      // Newest first, then the same dedupe the Prisma repository applies.
      const rows: RecentSearchRow[] = records
        .map((record, index) => ({
          id: `search_${index}`,
          term: record.term,
          locale: record.locale,
          resultCount: record.resultCount,
          createdAt: new Date(2026, 0, 1, 0, 0, index),
        }))
        .reverse();

      return dedupeRecentSearches(rows, limit);
    },
  };

  return repository;
}

export type FakeOffClient = OffClient & {
  calls: OffSearchParams[];
};

export function createFakeOffClient(products: OffProduct[]): FakeOffClient {
  const calls: OffSearchParams[] = [];

  return {
    calls,
    async search(params) {
      calls.push(params);
      return products;
    },
    async getByBarcode(barcode) {
      return products.find((product) => product.code === barcode) ?? null;
    },
  };
}

/** Mirrors the messiness of real Open Food Facts payloads. */
export const SAMPLE_OFF_PRODUCTS: OffProduct[] = [
  {
    code: "3017620422003",
    product_name: "Nutella",
    product_name_fr: "Nutella pâte à tartiner",
    product_name_de: "Nutella Nuss-Nougat-Creme",
    brands: "Ferrero",
    image_url: "https://images.openfoodfacts.org/images/products/nutella.jpg",
    quantity: "400 g",
    nutriscore_grade: "e",
    serving_size: "15 g",
    nutriments: {
      // Strings on purpose: Open Food Facts mixes types.
      "energy-kcal_100g": "539",
      fat_100g: 30.9,
      "saturated-fat_100g": "10.6",
      carbohydrates_100g: 57.5,
      sugars_100g: "56.3",
      proteins_100g: 6.3,
      salt_100g: "0.107",
    },
  },
  {
    code: "5000112637922",
    product_name: "   ",
    brands: "",
    nutriments: {},
  },
];
