import { execFileSync } from "node:child_process";

/** Brings the test database up to the latest migration before any test runs. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL must be set (a separate database: tests write to it).");
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
  // The test bucket (needs `pnpm dev:services` locally; CI starts the same S3 server).
  execFileSync("pnpm", ["exec", "tsx", "scripts/storage-setup.ts"], {
    env: { ...process.env, S3_BUCKET: process.env.TEST_S3_BUCKET ?? "harsol27-test", BETTER_AUTH_URL: "http://localhost:3217" },
    stdio: "inherit",
  });
}
