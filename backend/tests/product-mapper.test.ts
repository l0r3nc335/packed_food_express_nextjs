import { describe, expect, it } from "vitest";
import {
  mapNutrition,
  mapOffProduct,
  mapOffProducts,
  resolveProductName,
  toNumber,
} from "../src/services/product-mapper";
import type { OffProduct } from "../src/services/off-types";

describe("resolveProductName", () => {
  it("prefers the localized name for the requested locale", () => {
    const raw: OffProduct = {
      product_name: "Chocolate spread",
      product_name_fr: "Pâte à tartiner",
      product_name_de: "Nuss-Nougat-Creme",
    };

    expect(resolveProductName(raw, "fr")).toBe("Pâte à tartiner");
    expect(resolveProductName(raw, "de")).toBe("Nuss-Nougat-Creme");
  });

  it("falls back to the generic name when the locale is missing", () => {
    const raw: OffProduct = { product_name: "Chocolate spread" };

    expect(resolveProductName(raw, "nl")).toBe("Chocolate spread");
  });

  it("falls back to generic_name before giving up", () => {
    const raw: OffProduct = { generic_name_nl: "Chocoladepasta" };
    expect(resolveProductName(raw, "nl")).toBe("Chocoladepasta");

    expect(resolveProductName({ generic_name: "Spread" }, "nl")).toBe("Spread");
  });

  it("treats blank and non-string values as absent so the UI can show a placeholder", () => {
    expect(resolveProductName({ product_name: "   " }, "en")).toBeNull();
    expect(resolveProductName({ product_name: 42 }, "en")).toBeNull();
    expect(resolveProductName({}, "en")).toBeNull();
  });
});

describe("toNumber", () => {
  it("accepts the numbers and numeric strings Open Food Facts mixes together", () => {
    expect(toNumber(6.1)).toBe(6.1);
    expect(toNumber("6.1")).toBe(6.1);
    expect(toNumber("6,1")).toBe(6.1);
    expect(toNumber(0)).toBe(0);
  });

  it("rejects values that are not usable numbers", () => {
    expect(toNumber("")).toBeNull();
    expect(toNumber("unknown")).toBeNull();
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
    expect(toNumber(Number.NaN)).toBeNull();
  });
});

describe("mapNutrition", () => {
  it("coerces mixed string and number nutriments", () => {
    const nutrition = mapNutrition({
      nutriments: { "energy-kcal_100g": "539", fat_100g: 30.9, salt_100g: "0.107" },
    });

    expect(nutrition.energyKcal).toBe(539);
    expect(nutrition.fat).toBe(30.9);
    expect(nutrition.salt).toBe(0.107);
  });

  it("falls back to the non-per-100g field and nulls what is absent", () => {
    const nutrition = mapNutrition({ nutriments: { proteins: "7.3" } });

    expect(nutrition.proteins).toBe(7.3);
    expect(nutrition.sugars).toBeNull();
  });

  it("survives a missing nutriments object entirely", () => {
    const nutrition = mapNutrition({});

    expect(nutrition.energyKcal).toBeNull();
    expect(nutrition.nutriScore).toBeNull();
  });

  it("uppercases a real Nutri-Score grade", () => {
    expect(mapNutrition({ nutriscore_grade: "e" }).nutriScore).toBe("E");
  });

  it("discards the placeholder grades Open Food Facts returns", () => {
    // Seen live: these must not render as a badge.
    expect(mapNutrition({ nutriscore_grade: "unknown" }).nutriScore).toBeNull();
    expect(mapNutrition({ nutriscore_grade: "not-applicable" }).nutriScore).toBeNull();
  });
});

describe("mapOffProduct", () => {
  it("maps a complete product", () => {
    const product = mapOffProduct(
      {
        code: "3017620422003",
        product_name_fr: "Nutella pâte à tartiner",
        brands: "Ferrero",
        image_url: "https://images.openfoodfacts.org/nutella.jpg",
        nutriments: { "energy-kcal_100g": "539" },
      },
      "fr",
    );

    expect(product).not.toBeNull();
    expect(product?.name).toBe("Nutella pâte à tartiner");
    expect(product?.brand).toBe("Ferrero");
    expect(product?.nutrition?.energyKcal).toBe(539);
  });

  it("drops products without a barcode because they cannot be identified", () => {
    expect(mapOffProduct({ product_name: "Mystery" }, "en")).toBeNull();
  });

  it("returns null nutrition when Open Food Facts holds no values", () => {
    const product = mapOffProduct({ code: "123", nutriments: {} }, "en");

    expect(product?.nutrition).toBeNull();
    expect(product?.name).toBeNull();
  });

  it("skips unusable entries when mapping a list", () => {
    const products = mapOffProducts([{ code: "123" }, { product_name: "No barcode" }], "en");

    expect(products).toHaveLength(1);
    expect(products[0]?.barcode).toBe("123");
  });
});
