"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useLocale } from "../i18n/locale-provider";

/**
 * Pushes the term into the URL so results are shareable and the server
 * component can render them directly.
 */
export function SearchForm({ initialQuery }: { initialQuery: string }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const term = value.trim();
        if (term === "") return;

        startTransition(() => {
          router.push(`/${locale}?q=${encodeURIComponent(term)}`);
        });
      }}
      className="flex flex-col gap-3 sm:flex-row"
    >
      <div className="flex-1">
        <label htmlFor="product-search" className="sr-only">
          {t("search.label")}
        </label>
        <input
          id="product-search"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("search.placeholder")}
          maxLength={100}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || value.trim() === ""}
        className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isPending ? t("search.searching") : t("search.submit")}
      </button>
    </form>
  );
}
