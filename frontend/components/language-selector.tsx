"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, LOCALE_LABELS, isLocale, type Locale } from "../i18n/config";
import { useLocale } from "../i18n/locale-provider";

/**
 * Manual language switch: swaps the leading path segment and keeps the current
 * search query, so the same results are shown in the new language.
 */
export function LanguageSelector() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function buildPath(nextLocale: Locale): string {
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length > 0 && isLocale(segments[0])) {
      segments[0] = nextLocale;
    } else {
      segments.unshift(nextLocale);
    }

    const query = searchParams.toString();
    return `/${segments.join("/")}${query ? `?${query}` : ""}`;
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-600">{t("language.label")}</span>
      <select
        aria-label={t("language.label")}
        value={locale}
        disabled={isPending}
        onChange={(event) => {
          const nextLocale = event.target.value;
          if (!isLocale(nextLocale)) return;
          startTransition(() => router.push(buildPath(nextLocale)));
        }}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
      >
        {LOCALES.map((option) => (
          <option key={option} value={option}>
            {LOCALE_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
