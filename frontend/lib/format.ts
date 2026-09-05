import type { Locale } from "../i18n/config";

const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-GB",
  nl: "nl-NL",
  de: "de-DE",
  fr: "fr-FR",
};

export function formatNumber(value: number, locale: Locale, unit?: string): string {
  const formatted = new Intl.NumberFormat(LOCALE_TAGS[locale], {
    maximumFractionDigits: 1,
  }).format(value);

  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatDate(isoDate: string, locale: Locale): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], { dateStyle: "medium" }).format(date);
}
