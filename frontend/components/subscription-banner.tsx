"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "../i18n/locale-provider";
import { cancelStubSubscription } from "../lib/api-client";
import type { BillingMode, SubscriptionSummary } from "../lib/api-types";
import { formatDate } from "../lib/format";
import { UpgradeButton } from "./upgrade-button";

type SubscriptionBannerProps = {
  subscription: SubscriptionSummary;
  billingMode: BillingMode;
};

export function SubscriptionBanner({ subscription, billingMode }: SubscriptionBannerProps) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [isCanceling, setIsCanceling] = useState(false);

  async function handleCancel(): Promise<void> {
    setIsCanceling(true);
    try {
      await cancelStubSubscription();
      router.refresh();
    } finally {
      setIsCanceling(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span
            aria-hidden="true"
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              subscription.isActive ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
          {subscription.isActive ? t("subscription.active") : t("subscription.inactive")}
        </p>

        {subscription.isActive && subscription.currentPeriodEnd ? (
          <p className="text-xs text-slate-500">
            {t("subscription.activeUntil", {
              date: formatDate(subscription.currentPeriodEnd, locale),
            })}
          </p>
        ) : null}

        {billingMode === "stub" ? (
          <p className="text-xs text-amber-700">{t("subscription.stubNotice")}</p>
        ) : null}
      </div>

      {subscription.isActive ? (
        billingMode === "stub" ? (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isCanceling}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 disabled:opacity-60"
          >
            {t("subscription.cancel")}
          </button>
        ) : null
      ) : (
        <UpgradeButton />
      )}
    </div>
  );
}
