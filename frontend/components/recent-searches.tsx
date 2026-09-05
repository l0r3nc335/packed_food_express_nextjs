"use client";

import Link from "next/link";
import { useLocale } from "../i18n/locale-provider";
import type { RecentSearch } from "../lib/api-types";

export function RecentSearches({ searches }: { searches: RecentSearch[] }) {
  const { locale, t } = useLocale();

  return (
    <section aria-labelledby="recent-heading" className="space-y-3">
      <h2 id="recent-heading" className="text-sm font-semibold text-slate-700">
        {t("recent.title")}
      </h2>

      {searches.length === 0 ? (
        <p className="text-sm text-slate-500">{t("recent.empty")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {searches.map((search) => (
            <li key={search.id}>
              <Link
                href={`/${locale}?q=${encodeURIComponent(search.term)}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700"
              >
                <span>{search.term}</span>
                <span className="text-xs text-slate-400">{search.resultCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
