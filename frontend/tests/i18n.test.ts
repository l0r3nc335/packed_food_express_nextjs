import { describe, expect, it } from "vitest";
import { LOCALES } from "../i18n/config";
import { DICTIONARIES, createTranslator, getMessages, translate } from "../i18n/dictionary";

describe("dictionaries", () => {
  it("ships a translation for every supported locale", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(getMessages(locale)).length).toBeGreaterThan(0);
    }
  });

  it("keeps the other locales in sync with the English key set", () => {
    const englishKeys = Object.keys(DICTIONARIES.en).sort();

    for (const locale of LOCALES) {
      expect(Object.keys(DICTIONARIES[locale]).sort()).toEqual(englishKeys);
    }
  });
});

describe("translate", () => {
  it("returns the translation for the active locale", () => {
    expect(translate(DICTIONARIES.nl, "search.submit")).toBe("Zoeken");
    expect(translate(DICTIONARIES.de, "search.submit")).toBe("Suchen");
    expect(translate(DICTIONARIES.fr, "search.submit")).toBe("Rechercher");
  });

  it("falls back to English when the locale lacks the key", () => {
    const partial = { "app.title": "Titel" };

    expect(translate(partial, "search.submit")).toBe("Search");
  });

  it("returns the key itself when no locale has the translation", () => {
    expect(translate({}, "search.submit", undefined, {})).toBe("search.submit");
  });

  it("interpolates named parameters", () => {
    expect(translate(DICTIONARIES.en, "search.resultsCount", { count: 3, query: "milk" })).toBe(
      "3 products found for “milk”",
    );
  });

  it("leaves unknown placeholders untouched rather than printing undefined", () => {
    expect(translate({ "app.title": "Hello {name}" }, "app.title", { other: "x" })).toBe(
      "Hello {name}",
    );
  });
});

describe("createTranslator", () => {
  it("binds a locale and still falls back to English", () => {
    const t = createTranslator("nl");

    expect(t("recent.title")).toBe("Recente zoekopdrachten");
    expect(t("search.emptyBody", { query: "kaas" })).toContain("kaas");
  });
});
