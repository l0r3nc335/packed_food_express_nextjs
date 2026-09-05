import de from "./messages/de.json";
import en from "./messages/en.json";
import fr from "./messages/fr.json";
import nl from "./messages/nl.json";
import { DEFAULT_LOCALE, type Locale } from "./config";

/** English is the source of truth: every other locale may be partial. */
export type MessageKey = keyof typeof en;
export type Messages = Partial<Record<MessageKey, string>>;

export const DICTIONARIES: Record<Locale, Messages> = { en, nl, de, fr };

export function getMessages(locale: Locale): Messages {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export type TranslateParams = Record<string, string | number>;

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}

/**
 * Resolves a key against the active locale, falls back to English, and finally
 * returns the key itself so a missing translation never renders as blank.
 */
export function translate(
  messages: Messages,
  key: MessageKey,
  params?: TranslateParams,
  fallback: Messages = DICTIONARIES[DEFAULT_LOCALE],
): string {
  const template = messages[key] ?? fallback[key] ?? key;
  return interpolate(template, params);
}

export type Translator = (key: MessageKey, params?: TranslateParams) => string;

export function createTranslator(locale: Locale): Translator {
  const messages = getMessages(locale);
  return (key, params) => translate(messages, key, params);
}
