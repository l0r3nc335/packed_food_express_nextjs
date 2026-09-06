import { notFound } from "next/navigation";
import { ProductGrid } from "../../components/product-grid";
import { RecentSearches } from "../../components/recent-searches";
import { SearchForm } from "../../components/search-form";
import { SubscriptionBanner } from "../../components/subscription-banner";
import { isLocale } from "../../i18n/config";
import { createTranslator } from "../../i18n/dictionary";
import {
  confirmCheckout,
  fetchDemoUser,
  fetchRecentSearches,
  searchProducts,
} from "../../lib/api-client";
import type { MeResponse, RecentSearch, SearchResult } from "../../lib/api-types";

type SearchPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Results depend on the query string and on live subscription state.
export const dynamic = "force-dynamic";

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** The API being unreachable should degrade the page, not crash it. */
async function tolerate<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const resolvedSearchParams = await searchParams;
  const query = readParam(resolvedSearchParams.q).trim();
  const checkout = readParam(resolvedSearchParams.checkout);
  const sessionId = readParam(resolvedSearchParams.session_id);
  const t = createTranslator(locale);

  // Confirm after Checkout (and heal missed webhooks) before reading /api/me,
  // so nutrition unlocks even when Stripe events never reached localhost.
  if (checkout === "success") {
    await tolerate(confirmCheckout(sessionId || undefined));
  } else {
    const preview = await tolerate<MeResponse>(fetchDemoUser());
    if (preview?.billingMode === "stripe" && !preview.user.subscription.isActive) {
      await tolerate(confirmCheckout());
    }
  }

  const [me, recent, result] = await Promise.all([
    tolerate<MeResponse>(fetchDemoUser()),
    tolerate<RecentSearch[]>(fetchRecentSearches()),
    query === "" ? Promise.resolve(null) : tolerate<SearchResult>(searchProducts(query, locale)),
  ]);

  const hasSearchFailed = query !== "" && result === null;

  return (
    <div className="space-y-8">
      {checkout === "success" ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {t("checkout.success")}
        </p>
      ) : null}

      {checkout === "canceled" ? (
        <p
          role="status"
          className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700"
        >
          {t("checkout.canceled")}
        </p>
      ) : null}

      {me ? (
        <SubscriptionBanner subscription={me.user.subscription} billingMode={me.billingMode} />
      ) : null}

      <SearchForm initialQuery={query} />

      <RecentSearches searches={recent ?? []} />

      {hasSearchFailed ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {t("search.error")}
        </p>
      ) : null}

      {result ? (
        <ProductGrid products={result.products} query={result.query} />
      ) : query === "" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">{t("search.promptTitle")}</h2>
          <p className="mt-2 text-sm text-slate-600">{t("search.promptBody")}</p>
        </div>
      ) : null}
    </div>
  );
}
