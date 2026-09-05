import { NotFoundError, ValidationError } from "../lib/errors";
import { logger } from "../lib/logger";
import type { SearchRepository, UserRepository } from "../repositories/types";
import type { Locale, Product, SearchResult } from "../types/product";
import type { OffClient } from "./off-client";
import { mapOffProduct, mapOffProducts } from "./product-mapper";
import { isSubscriptionActive } from "./subscription-service";

export type ProductServiceDeps = {
  offClient: OffClient;
  users: UserRepository;
  searches: SearchRepository;
};

export type ProductService = {
  search(params: { query: string; locale: Locale }): Promise<SearchResult>;
  getByBarcode(params: { barcode: string; locale: Locale }): Promise<Product>;
};

const MAX_QUERY_LENGTH = 100;

/**
 * Single choke point for the paywall. Nutrition is stripped from the payload
 * rather than merely hidden, so the data never reaches the browser.
 */
export function applyNutritionGate(product: Product, isSubscribed: boolean): Product {
  if (isSubscribed) {
    return { ...product, isNutritionLocked: false };
  }

  return { ...product, nutrition: null, isNutritionLocked: true };
}

export function normalizeQuery(rawQuery: string): string {
  const query = rawQuery.trim();

  if (query === "") {
    throw new ValidationError("A search term is required");
  }

  if (query.length > MAX_QUERY_LENGTH) {
    throw new ValidationError(`A search term may not exceed ${MAX_QUERY_LENGTH} characters`);
  }

  return query;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

/** Keeps only products whose displayed name or brand contains every search word. */
export function filterProductsByQuery(products: readonly Product[], query: string): Product[] {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);

  return products.filter((product) => {
    const searchableText = normalizeSearchText([product.name, product.brand].filter(Boolean).join(" "));
    return terms.every((term) => searchableText.includes(term));
  });
}

export function createProductService(deps: ProductServiceDeps): ProductService {
  return {
    async search({ query, locale }): Promise<SearchResult> {
      const term = normalizeQuery(query);
      const user = await deps.users.getDemoUser();
      const isSubscribed = isSubscriptionActive(user.subscription);

      const rawProducts = await deps.offClient.search({ query: term });
      const products = filterProductsByQuery(mapOffProducts(rawProducts, locale), term).map(
        (product) => applyNutritionGate(product, isSubscribed),
      );

      try {
        await deps.searches.record({
          userId: user.id,
          term,
          locale,
          resultCount: products.length,
        });
      } catch (error) {
        // History is a convenience feature; a storage failure must not cost the
        // user their search results, but it is still reported.
        logger.error("Failed to persist recent search", { term, locale, error });
      }

      return { query: term, locale, count: products.length, isSubscribed, products };
    },

    async getByBarcode({ barcode, locale }): Promise<Product> {
      const trimmed = barcode.trim();
      if (!/^\d{4,20}$/.test(trimmed)) {
        throw new ValidationError("A valid product barcode is required");
      }

      const user = await deps.users.getDemoUser();
      const isSubscribed = isSubscriptionActive(user.subscription);

      const raw = await deps.offClient.getByBarcode(trimmed);
      if (!raw) {
        throw new NotFoundError(`No product found for barcode ${trimmed}`);
      }

      const product = mapOffProduct(raw, locale);
      if (!product) {
        throw new NotFoundError(`No usable product data for barcode ${trimmed}`);
      }

      return applyNutritionGate(product, isSubscribed);
    },
  };
}
