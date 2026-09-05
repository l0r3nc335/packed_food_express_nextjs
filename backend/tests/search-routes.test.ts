import request from "supertest";
import { describe, expect, it } from "vitest";
import { filterProductsByQuery } from "../src/services/product-service";
import type { Product } from "../src/types/product";
import type { RecentSearch, SearchResult } from "../src/types/product";
import { createTestApp } from "./helpers/test-app";

const product = (name: string | null, brand: string | null = null): Product => ({
  barcode: `${name ?? brand ?? "unknown"}-barcode`,
  name,
  brand,
  imageUrl: null,
  quantity: null,
  categories: null,
  isNutritionLocked: false,
  nutrition: null,
});

describe("filterProductsByQuery", () => {
  it("removes unrelated products returned by Open Food Facts", () => {
    const products = [
      product("Lait entier"),
      product("Eau minérale naturelle"),
      product("Chocolate", "Lait"),
    ];

    expect(filterProductsByQuery(products, "Lait").map(({ name }) => name)).toEqual([
      "Lait entier",
      "Chocolate",
    ]);
  });

  it("matches case, accents, and every word in the query", () => {
    const products = [
      product("Crème au lait"),
      product("Lait pasteurisé"),
      product("Crème fraîche"),
    ];

    expect(filterProductsByQuery(products, "CREME LAIT").map(({ name }) => name)).toEqual([
      "Crème au lait",
    ]);
  });
});

describe("GET /api/products/search", () => {
  it("rejects a blank search term", async () => {
    const { app } = createTestApp();

    const response = await request(app).get("/api/products/search").query({ q: "   " });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: "validation_error", message: "A search term is required" },
    });
  });

  it("rejects an over-long search term", async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .get("/api/products/search")
      .query({ q: "a".repeat(101) });

    expect(response.status).toBe(400);
  });

  it("returns an empty list without failing when nothing matches", async () => {
    const { app, searches } = createTestApp({ products: [] });

    const response = await request(app).get("/api/products/search").query({ q: "zzzzz" });
    const body = response.body as SearchResult;

    expect(response.status).toBe(200);
    expect(body.count).toBe(0);
    expect(body.products).toEqual([]);
    // A zero-result search is still part of the user's history.
    expect(searches.records).toHaveLength(1);
    expect(searches.records[0]?.resultCount).toBe(0);
  });

  it("persists the trimmed term and locale for the demo user", async () => {
    const { app, searches, users } = createTestApp();

    await request(app).get("/api/products/search").query({ q: "  nutella  ", locale: "fr" });

    expect(searches.records).toEqual([
      { userId: users.user.id, term: "nutella", locale: "fr", resultCount: 1 },
    ]);
  });

  it("falls back to English for an unsupported locale", async () => {
    const { app, searches } = createTestApp();

    const response = await request(app)
      .get("/api/products/search")
      .query({ q: "nutella", locale: "es" });

    expect((response.body as SearchResult).locale).toBe("en");
    expect(searches.records[0]?.locale).toBe("en");
  });

  it("still returns results when writing the search history fails", async () => {
    const { app, searches } = createTestApp();
    searches.failOnRecord = true;

    const response = await request(app).get("/api/products/search").query({ q: "nutella" });

    expect(response.status).toBe(200);
    expect((response.body as SearchResult).products.length).toBeGreaterThan(0);
  });
});

describe("GET /api/products/:barcode", () => {
  it("rejects a barcode that is not numeric", async () => {
    const { app } = createTestApp();

    const response = await request(app).get("/api/products/not-a-barcode");

    expect(response.status).toBe(400);
  });

  it("returns 404 when Open Food Facts has no such product", async () => {
    const { app } = createTestApp({ products: [] });

    const response = await request(app).get("/api/products/9999999999");

    expect(response.status).toBe(404);
  });
});

describe("GET /api/searches/recent", () => {
  it("lists the most recent searches first without duplicates", async () => {
    const { app } = createTestApp();

    await request(app).get("/api/products/search").query({ q: "nutella" });
    await request(app).get("/api/products/search").query({ q: "yoghurt" });
    await request(app).get("/api/products/search").query({ q: "nutella" });

    const response = await request(app).get("/api/searches/recent");
    const body = response.body as { searches: RecentSearch[] };

    expect(response.status).toBe(200);
    expect(body.searches.map((search) => search.term)).toEqual(["nutella", "yoghurt"]);
  });
});

describe("unknown routes", () => {
  it("returns a structured 404", async () => {
    const { app } = createTestApp();

    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "not_found", message: "Route not found" },
    });
  });
});
