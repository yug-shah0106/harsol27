import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { Client } from "pg";
import { STAFF } from "./staff";

/** Fresh test database with one admin and one viewer, created through the real staff CLI. */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL must be set (a separate database: tests write to it).");
  const env = { ...process.env, DATABASE_URL: url };

  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], { env, stdio: "inherit" });

  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query(`TRUNCATE "User", "RateLimit" CASCADE`);
  await client.end();

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
}
