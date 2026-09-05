describe("product search", () => {
  it("keeps the submit button disabled for an empty search", () => {
    cy.visit("/en");

    cy.findByRole("button", { name: "Search" }).should("be.disabled");
    cy.findByRole("searchbox").type("   ");
    cy.findByRole("button", { name: "Search" }).should("be.disabled");
  });

  it("submits a query and renders matching and incomplete products safely", () => {
    cy.visit("/en");

    cy.findByRole("searchbox").type("chocolate");
    cy.findByRole("button", { name: "Search" }).click();

    cy.location("search").should("contain", "q=chocolate");
    cy.contains("2 products found for “chocolate”").should("be.visible");
    cy.contains("Chocolate spread").should("be.visible");
    cy.contains("Demo Brand").should("be.visible");
    cy.contains("Unnamed product").should("be.visible");
    cy.contains("Unknown brand").should("be.visible");
    cy.findAllByText("No image available").should("have.length", 2);
    cy.findAllByText("Subscribers only").should("have.length", 2);
  });

  it("renders an empty state when the API has no matching products", () => {
    cy.visit("/en?q=empty");

    cy.findByRole("heading", { name: "No products found" }).should("be.visible");
    cy.contains("We could not find anything for “empty”").should("be.visible");
  });

  it("renders a recoverable error when product search fails", () => {
    cy.visit("/en?q=error");

    cy.findByRole("alert").should(
      "contain.text",
      "Something went wrong while searching. Please try again.",
    );
  });

  it("opens a seeded recent search", () => {
    cy.request("POST", "http://localhost:4100/__e2e/seed-recent");
    cy.visit("/en");

    cy.findByRole("link", { name: /yoghurt/ }).click();

    cy.location("search").should("contain", "q=yoghurt");
    cy.contains("2 products found for “yoghurt”").should("be.visible");
  });
});
