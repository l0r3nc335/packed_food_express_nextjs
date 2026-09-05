import { defineConfig } from "cypress";
import { createMockApiServer } from "./cypress/support/mock-api";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3100",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on) {
      const mockApi = createMockApiServer(4100);

      on("after:run", async () => {
        await mockApi.close();
      });
    },
  },
});
