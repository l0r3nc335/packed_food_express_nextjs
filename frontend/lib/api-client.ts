import type { Locale } from "../i18n/config";
import type { ApiErrorBody, MeResponse, RecentSearch, SearchResult } from "./api-types";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    // Subscription state and search history must never be served from a cache.
    cache: "no-store",
    ...init,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      body?.error.message ?? `Request failed with status ${response.status}`,
      response.status,
      body?.error.code ?? "unknown_error",
    );
  }

  return (await response.json()) as T;
}

export async function searchProducts(query: string, locale: Locale): Promise<SearchResult> {
  const params = new URLSearchParams({ q: query, locale });
  return request<SearchResult>(`/api/products/search?${params.toString()}`);
}

export async function fetchRecentSearches(limit = 8): Promise<RecentSearch[]> {
  const body = await request<{ searches: RecentSearch[] }>(`/api/searches/recent?limit=${limit}`);
  return body.searches;
}

export async function fetchDemoUser(): Promise<MeResponse> {
  return request<MeResponse>("/api/me");
}

export async function startCheckout(locale: Locale): Promise<{ url: string }> {
  return request<{ url: string; sessionId: string }>("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
  });
}

/** Syncs subscription after Stripe redirects back (or when a webhook was missed). */
export async function confirmCheckout(sessionId?: string): Promise<{ applied: boolean; status: string | null }> {
  return request<{ applied: boolean; status: string | null }>("/api/billing/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sessionId ? { sessionId } : {}),
  });
}

export async function cancelStubSubscription(): Promise<void> {
  await request<{ status: string }>("/api/billing/stub/cancel", { method: "POST" });
}
