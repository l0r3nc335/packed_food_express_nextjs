describe("subscription UI", () => {
  it("completes stub checkout, unlocks nutrition, and cancels the subscription", () => {
    cy.visit("/en?q=chocolate");

    cy.findAllByRole("button", { name: "Subscribe monthly" }).first().click();

    cy.location("origin").should("eq", "http://localhost:3100");
    cy.location("search").should("contain", "checkout=success");
    cy.findByRole("status").should("contain.text", "Subscription activated");
    cy.contains("Subscription active").should("be.visible");

    cy.visit("/en?q=chocolate");
    cy.findByRole("heading", { name: "Nutritional values" }).should("be.visible");
    cy.contains("539 kcal").should("be.visible");
    cy.contains("Nutri-Score").should("be.visible");
    cy.contains("Serving size: 15 g").should("be.visible");

    cy.findByRole("button", { name: "Cancel subscription" }).click();
    cy.contains("No active subscription").should("be.visible");
    cy.contains("Subscribers only").should("be.visible");
  });

  it("shows checkout failures without leaving the page", () => {
    cy.request("POST", "http://localhost:4100/__e2e/fail-checkout");
    cy.visit("/en");

    cy.findByRole("button", { name: "Subscribe monthly" }).click();

    cy.findByRole("alert").should(
      "contain.text",
      "Could not start the checkout. Please try again.",
    );
    cy.location("pathname").should("eq", "/en");
  });

  it("shows the checkout canceled message", () => {
    cy.visit("/en?checkout=canceled");

    cy.findByRole("status").should(
      "contain.text",
      "Checkout was cancelled. Nothing was charged.",
    );
  });
});
