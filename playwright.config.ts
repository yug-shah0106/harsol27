import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

// E2E runs the production build (`pnpm build` first) against the test database.
const PORT = 3217;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Service workers off by default: requests they make bypass the per-test IP routing. The PWA test turns them on.
  use: { baseURL, trace: "retain-on-failure", serviceWorkers: "block" },
  // Software WebGL, so the home page's 3D scene also runs on CI machines without a GPU.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--enable-unsafe-swiftshader"] } } }],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
      CLIENT_IP_HEADER: "x-forwarded-for",
      SMS_PROVIDER: "console",
      S3_ENDPOINT: process.env.S3_ENDPOINT ?? "http://127.0.0.1:8333",
      S3_BUCKET: process.env.TEST_S3_BUCKET ?? "harsol27-test",
      S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? "local-dev-access-key",
      S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? "local-dev-secret-key-not-for-production",
    },
  },
});
