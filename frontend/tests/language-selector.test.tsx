import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageSelector } from "../components/language-selector";
import { LocaleProvider } from "../i18n/locale-provider";

const push = vi.fn();
let pathname = "/en";
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
  useSearchParams: () => searchParams,
}));

function renderSelector(locale: "en" | "nl" | "de" | "fr" = "en") {
  return render(
    <LocaleProvider locale={locale}>
      <LanguageSelector />
    </LocaleProvider>,
  );
}

describe("LanguageSelector", () => {
  beforeEach(() => {
    push.mockClear();
    pathname = "/en";
    searchParams = new URLSearchParams();
  });

  it("offers all four supported languages", () => {
    renderSelector();

    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["English", "Nederlands", "Deutsch", "Français"]);
  });

  it("labels itself in the active language", () => {
    renderSelector("fr");

    expect(screen.getByLabelText("Langue")).toBeInTheDocument();
  });

  it("swaps the locale segment when a new language is chosen", () => {
    renderSelector();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "de" } });

    expect(push).toHaveBeenCalledWith("/de");
  });

  it("keeps the current search term when switching language", () => {
    searchParams = new URLSearchParams({ q: "chocolate" });
    renderSelector();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "nl" } });

    expect(push).toHaveBeenCalledWith("/nl?q=chocolate");
  });
});
