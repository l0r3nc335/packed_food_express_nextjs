import { afterEach, describe, expect, it, vi } from "vitest";
import { UpstreamError } from "../src/lib/errors";
import { createOffClient } from "../src/services/off-client";

const options = {
  baseUrl: "https://world.openfoodfacts.org",
  userAgent: "FoodProductSearch/1.0 (test)",
  timeoutMs: 1000,
};

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, ...response });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createOffClient", () => {
  it("sends a descriptive User-Agent and asks for every localized name field", async () => {
    const fetchMock = mockFetchOnce({ json: async () => ({ products: [{ code: "1" }] }) });
    const client = createOffClient(options);

    await client.search({ query: "chocolate" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("search_terms=chocolate");
    expect(url).toContain("product_name_fr");
    expect(url).toContain("product_name_nl");
    // The locale is resolved locally, so it is not sent upstream.
    expect(url).not.toContain("lc=");
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe(options.userAgent);
  });

  it("serves every locale from one cached upstream response", async () => {
    const fetchMock = mockFetchOnce({ json: async () => ({ products: [{ code: "1" }] }) });
    const client = createOffClient(options);

    await client.search({ query: "chocolate" });
    await client.search({ query: "Chocolate" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces a rate limit as an upstream error without retrying", async () => {
    const fetchMock = mockFetchOnce({ ok: false, status: 429 });
    const client = createOffClient(options);

    await expect(client.search({ query: "chocolate" })).rejects.toBeInstanceOf(
      UpstreamError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once when Open Food Facts answers 503", async () => {
    // Observed live: the service intermittently returns 503.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ products: [{ code: "1" }] }) });
    vi.stubGlobal("fetch", fetchMock);

    const products = await createOffClient(options).search({ query: "chocolate" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(products).toHaveLength(1);
  });

  it("gives up after the retries and reports an upstream error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createOffClient(options).search({ query: "chocolate" }),
    ).rejects.toBeInstanceOf(UpstreamError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("falls back to stale results when Open Food Facts becomes unavailable", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ products: [{ code: "1" }] }) })
      .mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);

    const client = createOffClient({ ...options, cacheTtlMs: 0 });

    const fresh = await client.search({ query: "chocolate" });
    const stale = await client.search({ query: "chocolate" });

    expect(fresh).toEqual(stale);
    expect(stale).toHaveLength(1);
  });

  it("returns null for a barcode Open Food Facts does not know", async () => {
    mockFetchOnce({ json: async () => ({ status: 0 }) });
    const client = createOffClient(options);

    await expect(client.getByBarcode("0000000000000")).resolves.toBeNull();
  });

  it("tolerates a payload without a products array", async () => {
    mockFetchOnce({ json: async () => ({ count: 0 }) });
    const client = createOffClient(options);

    await expect(client.search({ query: "chocolate" })).resolves.toEqual([]);
  });
});
