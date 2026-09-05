"use client";

import { useState } from "react";
import { useLocale } from "../i18n/locale-provider";
import { startCheckout } from "../lib/api-client";

export function UpgradeButton({ variant = "default" }: { variant?: "default" | "compact" }) {
  const { locale, t } = useLocale();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(): Promise<void> {
    setIsRedirecting(true);
    setError(null);

    try {
      const session = await startCheckout(locale);
      // Stripe hosts the payment page; in stub mode this points back at the API.
      window.location.href = session.url;
    } catch {
      setError(t("subscription.error"));
      setIsRedirecting(false);
    }
  }

  const sizing = variant === "compact" ? "px-3 py-1.5 text-sm" : "px-5 py-2.5 text-sm";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isRedirecting}
        className={`rounded-lg bg-emerald-600 font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 ${sizing}`}
      >
        {isRedirecting ? t("subscription.upgrading") : t("subscription.upgrade")}
      </button>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
