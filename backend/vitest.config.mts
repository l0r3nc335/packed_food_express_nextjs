import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      // Tests never touch MySQL; repositories are replaced with in-memory fakes.
      DATABASE_URL: "mysql://test:test@localhost:3307/food_search_test",
      FRONTEND_URL: "http://localhost:3000",
    },
  },
});
