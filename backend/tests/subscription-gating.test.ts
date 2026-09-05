import request from "supertest";
import { describe, expect, it } from "vitest";
import { applyNutritionGate } from "../src/services/product-service";
import { isSubscriptionActive, toSubscriptionSummary } from "../src/services/subscription-service";
import type { Product, SearchResult } from "../src/types/product";
import { ACTIVE_SUBSCRIPTION, createTestApp } from "./helpers/test-app";

const sampleProduct: Product = {
  barcode: "123",
  name: "Test product",
  brand: "Test brand",
  imageUrl: null,
  quantity: null,
  categories: null,
  isNutritionLocked: false,
  nutrition: {
    energyKcal: 100,
    fat: 1,
    saturatedFat: 0.5,
    carbohydrates: 10,
    sugars: 5,
    fiber: 1,
    proteins: 2,
    salt: 0.1,
    servingSize: "30 g",
    nutriScore: "B",
  },
};

describe("isSubscriptionActive", () => {
  it("accepts active and trialing subscriptions", () => {
    expect(isSubscriptionActive({ status: "active", currentPeriodEnd: null })).toBe(true);
    expect(isSubscriptionActive({ status: "trialing", currentPeriodEnd: null })).toBe(true);
  });

  it("rejects missing, canceled and past-due subscriptions", () => {
    expect(isSubscriptionActive(null)).toBe(false);
    expect(isSubscriptionActive({ status: "canceled", currentPeriodEnd: null })).toBe(false);
    expect(isSubscriptionActive({ status: "past_due", currentPeriodEnd: null })).toBe(false);
  });

  it("rejects an active subscription whose paid period has lapsed", () => {
    const lapsed = { status: "active", currentPeriodEnd: new Date("2020-01-01T00:00:00.000Z") };

    expect(isSubscriptionActive(lapsed)).toBe(false);
  });

  it("reports an unknown Stripe status as none", () => {
    expect(toSubscriptionSummary({ status: "paused", currentPeriodEnd: null }).status).toBe("none");
  });
});

describe("applyNutritionGate", () => {
  it("keeps nutrition for subscribers", () => {
    const gated = applyNutritionGate(sampleProduct, true);

    expect(gated.isNutritionLocked).toBe(false);
    expect(gated.nutrition?.energyKcal).toBe(100);
  });

  it("removes nutrition entirely for non-subscribers", () => {
    const gated = applyNutritionGate(sampleProduct, false);

    expect(gated.isNutritionLocked).toBe(true);
    expect(gated.nutrition).toBeNull();
  });
});

describe("GET /api/products/search subscription gating", () => {
  it("omits nutritional values when the demo user has no subscription", async () => {
    const { app } = createTestApp();

    const response = await request(app).get("/api/products/search").query({ q: "nutella" });
    const body = response.body as SearchResult;

    expect(response.status).toBe(200);
    expect(body.isSubscribed).toBe(false);
    expect(body.products.length).toBeGreaterThan(0);

    for (const product of body.products) {
      expect(product.isNutritionLocked).toBe(true);
      expect(product.nutrition).toBeNull();
    }

    // The paywalled numbers must not leak anywhere in the payload.
    expect(JSON.stringify(body)).not.toContain("539");
  });

  it("returns nutritional values when the subscription is active", async () => {
    const { app } = createTestApp({ user: { subscription: ACTIVE_SUBSCRIPTION } });

    const response = await request(app).get("/api/products/search").query({ q: "nutella" });
    const body = response.body as SearchResult;

    expect(response.status).toBe(200);
    expect(body.isSubscribed).toBe(true);
    expect(body.products[0]?.isNutritionLocked).toBe(false);
    expect(body.products[0]?.nutrition?.energyKcal).toBe(539);
  });

  it("gates the single-product endpoint too, not just search", async () => {
    const { app } = createTestApp();

    const response = await request(app).get("/api/products/3017620422003");
    const body = response.body as { product: Product };

    expect(response.status).toBe(200);
    expect(body.product.isNutritionLocked).toBe(true);
    expect(body.product.nutrition).toBeNull();
  });
});
