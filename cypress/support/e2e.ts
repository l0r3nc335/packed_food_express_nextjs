import "@testing-library/cypress/add-commands";

beforeEach(() => {
  cy.request("POST", "http://localhost:4100/__e2e/reset");
});
