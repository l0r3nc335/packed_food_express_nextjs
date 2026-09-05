import { TtlCache } from "../lib/cache";
import { UpstreamError } from "../lib/errors";
import { logger } from "../lib/logger";
import { OFF_FIELDS, type OffProduct, type OffSearchResponse } from "./off-types";

export type OffClientOptions = {
  baseUrl: string;
  userAgent: string;
  timeoutMs: number;
  cacheTtlMs?: number;
};

export type OffSearchParams = {
  query: string;
  pageSize?: number;
};

export type OffClient = {
  search(params: OffSearchParams): Promise<OffProduct[]>;
  getByBarcode(barcode: string): Promise<OffProduct | null>;
};

function readProducts(payload: OffSearchResponse): OffProduct[] {
  if (!Array.isArray(payload.products)) return [];
  return payload.products.filter(
    (item): item is OffProduct => typeof item === "object" && item !== null,
  );
}

/**
 * Anonymous Open Food Facts traffic is throttled with intermittent 503s that
 * clear on a later attempt, so a couple of quick retries hide most of them.
 */
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 600;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createOffClient(options: OffClientOptions): OffClient {
  const cache = new TtlCache<OffProduct[]>(options.cacheTtlMs ?? 60_000);

  async function requestOnce(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          // Open Food Facts requires callers to identify themselves.
          "User-Agent": options.userAgent,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (response.status === 429) {
        // Retrying a rate limit only makes it worse.
        throw new UpstreamError("Open Food Facts rate limit reached, please retry shortly");
      }

      if (!response.ok) {
        throw new UpstreamError(`Open Food Facts responded with status ${response.status}`, {
          isRetryable: response.status >= 500,
        });
      }

      return await response.json();
    } catch (error) {
      if (error instanceof UpstreamError) throw error;

      if (error instanceof Error && error.name === "AbortError") {
        throw new UpstreamError("Open Food Facts request timed out", { cause: error });
      }

      throw new UpstreamError("Unable to reach Open Food Facts", { cause: error, isRetryable: true });
    } finally {
      clearTimeout(timeout);
    }
  }

  async function request(url: string): Promise<unknown> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        return await requestOnce(url);
      } catch (error) {
        lastError = error;

        const canRetry =
          error instanceof UpstreamError && error.isRetryable && attempt < MAX_ATTEMPTS;
        if (!canRetry) throw error;

        logger.warn("Retrying Open Food Facts request", { attempt, url });
        await delay(RETRY_DELAY_MS * attempt);
      }
    }

    throw lastError;
  }

  return {
    /**
     * The locale is deliberately not sent upstream. Every localized name field
     * is requested at once and resolved in the mapper, so a single cached
     * response serves all four languages and upstream load drops accordingly.
     */
    async search({ query, pageSize = 24 }): Promise<OffProduct[]> {
      const cacheKey = `search:${pageSize}:${query.toLowerCase()}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const url = new URL("/api/v2/search", options.baseUrl);
      url.searchParams.set("search_terms", query);
      url.searchParams.set("page_size", String(pageSize));
      url.searchParams.set("fields", OFF_FIELDS);

      let payload: unknown;
      try {
        payload = await request(url.toString());
      } catch (error) {
        // Anonymous callers are throttled unpredictably; stale results are far
        // more useful than an error page.
        const stale = cache.getStale(cacheKey);
        if (stale) {
          logger.warn("Serving stale Open Food Facts results", { query });
          return stale;
        }
        throw error;
      }

      if (typeof payload !== "object" || payload === null) {
        throw new UpstreamError("Unexpected Open Food Facts search payload");
      }

      const products = readProducts(payload as OffSearchResponse);
      cache.set(cacheKey, products);
      logger.info("Open Food Facts search completed", { query, count: products.length });

      return products;
    },

    async getByBarcode(barcode: string): Promise<OffProduct | null> {
      const cacheKey = `product:${barcode}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached[0] ?? null;

      const url = new URL(`/api/v2/product/${encodeURIComponent(barcode)}`, options.baseUrl);
      url.searchParams.set("fields", OFF_FIELDS);

      const payload = await request(url.toString());
      if (typeof payload !== "object" || payload === null) {
        throw new UpstreamError("Unexpected Open Food Facts product payload");
      }

      const record = payload as { status?: unknown; product?: unknown };
      const isMissing = record.status === 0 || typeof record.product !== "object";
      if (isMissing || record.product === null) return null;

      const product = record.product as OffProduct;
      cache.set(cacheKey, [product]);

      return product;
    },
  };
}
