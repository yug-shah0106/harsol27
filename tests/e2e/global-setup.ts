import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { Client } from "pg";
import { STAFF } from "./staff";

/**
 * Fresh test database with one admin and one viewer (created through the real staff CLI), and the
 * real background worker running the photo queue only, so tests never send email to anyone.
 * Returns the teardown that stops the worker.
 */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL must be set (a separate database: tests write to it).");
  const env = { ...process.env, DATABASE_URL: url };

  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], { env, stdio: "inherit" });

  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query(`TRUNCATE "User", "RateLimit", "Lead", "Industry", "OtpChallenge", "BackupRun", "ServiceHeartbeat" CASCADE`);
  await client.end();

  execFileSync("pnpm", ["exec", "tsx", "prisma/seed.ts"], { env, stdio: "inherit" });
  execFileSync("pnpm", ["exec", "tsx", "scripts/storage-setup.ts"], {
    env: { ...env, S3_BUCKET: process.env.TEST_S3_BUCKET ?? "harsol27-test", BETTER_AUTH_URL: "http://localhost:3217" },
    stdio: "inherit",
  });

  for (const staff of Object.values(STAFF)) {
    // Random per run, shared with the test workers through the environment.
    const password = randomBytes(18).toString("base64url");
    process.env[staff.passwordEnv] = password;
    execFileSync("pnpm", ["--silent", "staff", "create", "--email", staff.email, "--name", staff.name, "--role", staff.role], {
      env,
      input: `${password}\n`,
      stdio: ["pipe", "inherit", "inherit"],
    });
  }

  // Node directly (not via pnpm), so stopping this process really stops the worker.
  const worker = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "src/worker.ts"], {
    env: {
      ...env,
      S3_BUCKET: process.env.TEST_S3_BUCKET ?? "harsol27-test",
      BETTER_AUTH_URL: "http://localhost:3217",
      WORKER_QUEUES: "product-photo",
      RESEND_API_KEY: "re_e2e_never_used",
      EMAIL_FROM: "Harsol27 <e2e@example.test>",
      TEAM_ALERT_EMAILS: "e2e@example.test",
    },
    stdio: ["ignore", "inherit", "inherit"],
  });
  return () => {
    worker.kill("SIGTERM");
  };
}
