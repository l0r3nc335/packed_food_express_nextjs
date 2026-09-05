import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductCard } from "../components/product-card";
import { LocaleProvider } from "../i18n/locale-provider";
import type { Locale } from "../i18n/config";
import type { Product } from "../lib/api-types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/en",
  useSearchParams: () => new URLSearchParams(),
}));

const baseProduct: Product = {
  barcode: "3017620422003",
  name: "Nutella",
  brand: "Ferrero",
  imageUrl: "https://images.openfoodfacts.org/nutella.jpg",
  quantity: "400 g",
  categories: null,
  isNutritionLocked: false,
  nutrition: {
    energyKcal: 539,
    fat: 30.9,
    saturatedFat: 10.6,
    carbohydrates: 57.5,
    sugars: 56.3,
    fiber: null,
    proteins: 6.3,
    salt: 0.107,
    servingSize: "15 g",
    nutriScore: "E",
  },
};

function renderCard(product: Product, locale: Locale = "en") {
  return render(
    <LocaleProvider locale={locale}>
      <ProductCard product={product} />
    </LocaleProvider>,
  );
}

describe("ProductCard", () => {
  it("shows nutritional values when they are not locked", () => {
    renderCard(baseProduct);

    expect(screen.getByText("Nutella")).toBeInTheDocument();
    expect(screen.getByText("539 kcal")).toBeInTheDocument();
    expect(screen.getByText("30.9 g")).toBeInTheDocument();
    // The Nutri-Score grade renders in its own badge element.
    expect(screen.getByText("E")).toBeInTheDocument();
  });

  it("hides the values and offers an upgrade when locked", () => {
    renderCard({ ...baseProduct, isNutritionLocked: true, nutrition: null });

    expect(screen.getByText("Subscribers only")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Subscribe monthly" })).toBeInTheDocument();
    expect(screen.queryByText("539 kcal")).not.toBeInTheDocument();
  });

  it("renders placeholders instead of crashing on an incomplete product", () => {
    renderCard({
      ...baseProduct,
      name: null,
      brand: null,
      imageUrl: null,
      quantity: null,
      nutrition: null,
    });

    expect(screen.getByText("Unnamed product")).toBeInTheDocument();
    expect(screen.getByText("Unknown brand")).toBeInTheDocument();
    expect(screen.getByText("No image available")).toBeInTheDocument();
    expect(
      screen.getByText("Open Food Facts has no nutritional data for this product."),
    ).toBeInTheDocument();
  });

  it("translates labels and formats numbers for the active locale", () => {
    renderCard(baseProduct, "fr");

    expect(screen.getByText("Valeurs nutritionnelles")).toBeInTheDocument();
    // French uses a comma as the decimal separator.
    expect(screen.getByText("30,9 g")).toBeInTheDocument();
  });

  it("omits nutrients Open Food Facts does not provide", () => {
    renderCard(baseProduct);

    expect(screen.queryByText("Fibre")).not.toBeInTheDocument();
  });
});
