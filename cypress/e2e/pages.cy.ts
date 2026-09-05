describe("localized search page", () => {
  it("redirects the root URL to English and renders the complete page shell", () => {
    cy.visit("/");

    cy.location("pathname").should("eq", "/en");
    cy.get("html").should("have.attr", "lang", "en");
    cy.findByRole("heading", { name: "Food Product Search" }).should("be.visible");
    cy.contains("Start with a search term").should("be.visible");
    cy.contains("Your recent searches will appear here.").should("be.visible");
    cy.contains("No active subscription").should("be.visible");
    cy.contains("Stripe test keys are not configured").should("be.visible");
    cy.contains("Product data from Open Food Facts").should("be.visible");
  });

  const locales = [
    { locale: "en", languageLabel: "Language", heading: "Food Product Search" },
    { locale: "nl", languageLabel: "Taal", heading: "Voedingsproducten zoeken" },
    { locale: "de", languageLabel: "Sprache", heading: "Lebensmittelsuche" },
    {
      locale: "fr",
      languageLabel: "Langue",
      heading: "Recherche de produits alimentaires",
    },
  ];

  for (const { locale, languageLabel, heading } of locales) {
    it(`renders the ${locale} page and language selector`, () => {
      cy.visit(`/${locale}`);

      cy.get("html").should("have.attr", "lang", locale);
      cy.findByRole("heading", { name: heading }).should("be.visible");
      cy.findByRole("combobox", { name: languageLabel })
        .should("have.value", locale)
        .find("option")
        .should("have.length", 4);
    });
  }

  it("switches language and keeps the active search query", () => {
    cy.visit("/en?q=chocolate");

    cy.findByRole("combobox", { name: "Language" }).select("fr");

    cy.location("pathname").should("eq", "/fr");
    cy.location("search").should("include", "q=chocolate");
    cy.findByRole("heading", { name: "Recherche de produits alimentaires" }).should("be.visible");
    cy.contains("Pâte à tartiner au chocolat").should("be.visible");
  });

  it("renders the not-found page for an unsupported locale", () => {
    cy.visit("/es", { failOnStatusCode: false });

    cy.findByRole("heading", { name: "404" }).should("be.visible");
    cy.findByRole("heading", { name: "This page could not be found." }).should("be.visible");
  });
});
