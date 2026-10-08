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
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    // Database tests share one test database; run files one at a time so they never interleave.
    fileParallelism: false,
    globalSetup: ["tests/vitest-global-setup.ts"],
    env: {
      DATABASE_URL: testDatabaseUrl ?? "",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0000",
      SMS_PROVIDER: "console",
      S3_ENDPOINT: process.env.S3_ENDPOINT ?? "http://127.0.0.1:8333",
      S3_BUCKET: process.env.TEST_S3_BUCKET ?? "harsol27-test",
      S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? "local-dev-access-key",
      S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? "local-dev-secret-key-not-for-production",
    },
  },
});
