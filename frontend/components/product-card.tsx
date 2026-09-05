"use client";

import { useState } from "react";
import { useLocale } from "../i18n/locale-provider";
import type { Product } from "../lib/api-types";
import { NutritionPanel } from "./nutrition-panel";

function ProductImage({ product }: { product: Product }) {
  const { t } = useLocale();
  const [hasFailed, setHasFailed] = useState(false);

  if (!product.imageUrl || hasFailed) {
    return (
      <div className="flex h-40 w-full items-center justify-center rounded-lg bg-slate-100 text-center text-xs text-slate-500">
        {t("product.noImage")}
      </div>
    );
  }

  return (
    // Plain <img>: Open Food Facts hosts images on several domains and a broken
    // one must degrade to the placeholder rather than fail the render.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.imageUrl}
      alt={product.name ?? t("product.unknownName")}
      loading="lazy"
      onError={() => setHasFailed(true)}
      className="h-40 w-full rounded-lg bg-white object-contain"
    />
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { t } = useLocale();

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <ProductImage product={product} />

      <div className="space-y-1">
        <h3 className="text-base leading-snug font-semibold text-slate-900">
          {product.name ?? t("product.unknownName")}
        </h3>
        <p className="text-sm text-slate-600">{product.brand ?? t("product.noBrand")}</p>
        {product.quantity ? <p className="text-xs text-slate-500">{product.quantity}</p> : null}
        <p className="text-xs text-slate-400">
          {t("product.barcode")}: {product.barcode}
        </p>
      </div>

      <div className="mt-auto">
        <NutritionPanel nutrition={product.nutrition} isLocked={product.isNutritionLocked} />
      </div>
    </li>
  );
}
