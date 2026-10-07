import "dotenv/config";
import path from "node:path";
import { defineConfig } from "vitest/config";

// Database-backed tests run against TEST_DATABASE_URL, never the development database.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside Next's server bundle; in tests every module is server-side.
      "server-only": path.resolve(import.meta.dirname, "tests/empty-module.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/vitest-global-setup.ts"],
    env: {
      DATABASE_URL: testDatabaseUrl ?? "",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0000",
    },
  },
});
