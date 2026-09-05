import type { Locale, NutritionFacts, Product } from "../types/product";
import type { OffProduct } from "./off-types";

/** Trims and rejects empty strings so the UI can rely on `null` meaning "absent". */
export function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Open Food Facts mixes numbers and numeric strings in `nutriments`. */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  if (typeof value === "string") {
    const trimmed = value.trim().replace(",", ".");
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * Only A-E are real grades. Open Food Facts also emits "unknown" and
 * "not-applicable", which must not reach the UI as a badge.
 */
export function readNutriScore(value: unknown): string | null {
  const grade = readString(value)?.toLowerCase();
  return grade && /^[a-e]$/.test(grade) ? grade.toUpperCase() : null;
}

/**
 * Localized name with graceful degradation:
 * product_name_<locale> -> product_name -> generic_name_<locale> -> generic_name.
 * Returns null when nothing usable exists; the UI renders a placeholder.
 */
export function resolveProductName(raw: OffProduct, locale: Locale): string | null {
  return (
    readString(raw[`product_name_${locale}`]) ??
    readString(raw.product_name) ??
    readString(raw[`generic_name_${locale}`]) ??
    readString(raw.generic_name) ??
    null
  );
}

export function mapNutrition(raw: OffProduct): NutritionFacts {
  const nutriments = readRecord(raw.nutriments);

  return {
    energyKcal: toNumber(nutriments["energy-kcal_100g"]) ?? toNumber(nutriments["energy-kcal"]),
    fat: toNumber(nutriments.fat_100g) ?? toNumber(nutriments.fat),
    saturatedFat:
      toNumber(nutriments["saturated-fat_100g"]) ?? toNumber(nutriments["saturated-fat"]),
    carbohydrates: toNumber(nutriments.carbohydrates_100g) ?? toNumber(nutriments.carbohydrates),
    sugars: toNumber(nutriments.sugars_100g) ?? toNumber(nutriments.sugars),
    fiber: toNumber(nutriments.fiber_100g) ?? toNumber(nutriments.fiber),
    proteins: toNumber(nutriments.proteins_100g) ?? toNumber(nutriments.proteins),
    salt: toNumber(nutriments.salt_100g) ?? toNumber(nutriments.salt),
    servingSize: readString(raw.serving_size),
    nutriScore: readNutriScore(raw.nutriscore_grade),
  };
}

/** True when Open Food Facts gave us nothing worth showing behind the paywall. */
export function hasAnyNutrition(nutrition: NutritionFacts): boolean {
  return (
    nutrition.energyKcal !== null ||
    nutrition.fat !== null ||
    nutrition.saturatedFat !== null ||
    nutrition.carbohydrates !== null ||
    nutrition.sugars !== null ||
    nutrition.fiber !== null ||
    nutrition.proteins !== null ||
    nutrition.salt !== null
  );
}

/**
 * Maps one upstream product. Nutrition is always attached here; gating happens
 * in the product service so a single place decides what leaves the API.
 */
export function mapOffProduct(raw: OffProduct, locale: Locale): Product | null {
  const barcode = readString(raw.code);
  if (!barcode) return null;

  const nutrition = mapNutrition(raw);

  return {
    barcode,
    name: resolveProductName(raw, locale),
    brand: readString(raw.brands),
    imageUrl: readString(raw.image_url) ?? readString(raw.image_front_url),
    quantity: readString(raw.quantity),
    categories: readString(raw.categories),
    isNutritionLocked: false,
    nutrition: hasAnyNutrition(nutrition) ? nutrition : null,
  };
}

export function mapOffProducts(rawProducts: readonly OffProduct[], locale: Locale): Product[] {
  const products: Product[] = [];

  for (const raw of rawProducts) {
    const product = mapOffProduct(raw, locale);
    if (product) products.push(product);
  }

  return products;
}
