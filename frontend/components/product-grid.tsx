"use client";

import { useLocale } from "../i18n/locale-provider";
import type { Product } from "../lib/api-types";
import { ProductCard } from "./product-card";

type ProductGridProps = {
  products: Product[];
  query: string;
};

export function ProductGrid({ products, query }: ProductGridProps) {
  const { t } = useLocale();

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">{t("search.emptyTitle")}</h2>
        <p className="mt-2 text-sm text-slate-600">{t("search.emptyBody", { query })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {t("search.resultsCount", { count: products.length, query })}
      </p>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.barcode} product={product} />
        ))}
      </ul>
    </div>
  );
}
