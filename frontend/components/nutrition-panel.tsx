"use client";

import { useLocale } from "../i18n/locale-provider";
import type { MessageKey } from "../i18n/dictionary";
import type { NutritionFacts } from "../lib/api-types";
import { formatNumber } from "../lib/format";
import { UpgradeButton } from "./upgrade-button";

type NutritionRow = {
  key: MessageKey;
  value: number | null;
  unit: string;
  isIndented?: boolean;
};

function buildRows(nutrition: NutritionFacts): NutritionRow[] {
  return [
    { key: "nutrition.energy", value: nutrition.energyKcal, unit: "kcal" },
    { key: "nutrition.fat", value: nutrition.fat, unit: "g" },
    { key: "nutrition.saturatedFat", value: nutrition.saturatedFat, unit: "g", isIndented: true },
    { key: "nutrition.carbohydrates", value: nutrition.carbohydrates, unit: "g" },
    { key: "nutrition.sugars", value: nutrition.sugars, unit: "g", isIndented: true },
    { key: "nutrition.fiber", value: nutrition.fiber, unit: "g" },
    { key: "nutrition.proteins", value: nutrition.proteins, unit: "g" },
    { key: "nutrition.salt", value: nutrition.salt, unit: "g" },
  ];
}

export function NutritionPanel({
  nutrition,
  isLocked,
}: {
  nutrition: NutritionFacts | null;
  isLocked: boolean;
}) {
  const { locale, t } = useLocale();

  if (isLocked) {
    return (
      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <span aria-hidden="true">🔒</span>
          {t("nutrition.locked")}
        </p>
        <p className="mt-1 text-sm text-amber-800">{t("nutrition.lockedBody")}</p>
        <div className="mt-3">
          <UpgradeButton variant="compact" />
        </div>
      </div>
    );
  }

  if (!nutrition) {
    return <p className="text-sm text-slate-500">{t("nutrition.unavailable")}</p>;
  }

  const rows = buildRows(nutrition).filter((row) => row.value !== null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-700">{t("nutrition.title")}</h4>
        <span className="text-xs text-slate-500">{t("nutrition.per100")}</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{t("nutrition.unavailable")}</p>
      ) : (
        <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between px-3 py-2 text-sm">
              <dt className={row.isIndented ? "pl-4 text-slate-500" : "text-slate-700"}>
                {t(row.key)}
              </dt>
              <dd className="font-medium text-slate-900">
                {formatNumber(row.value ?? 0, locale, row.unit)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {nutrition.nutriScore ? (
        <p className="text-xs text-slate-600">
          {t("nutrition.nutriScore")}:{" "}
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">
            {nutrition.nutriScore}
          </span>
        </p>
      ) : null}

      {nutrition.servingSize ? (
        <p className="text-xs text-slate-500">
          {t("nutrition.servingSize")}: {nutrition.servingSize}
        </p>
      ) : null}
    </div>
  );
}
