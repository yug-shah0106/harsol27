import { expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { hashOtp } from "../../src/server/otp-hash";

/** A random, valid Indian mobile number: "98xxxxxxxx" (local form) and its E.164 form. */
export function randomMobile(): { local: string; e164: string } {
  const local = `98${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
  return { local, e164: `+91${local}` };
}

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/**
 * The SMS sender is not connected yet (codes only go to the server log), so the test replaces the
 * stored hash of the code it just requested with the hash of a code it knows. Everything else (the
 * page, rate limits, attempts, single use, session creation) runs exactly as in production.
 */
export async function setKnownCode(e164: string, code: string): Promise<void> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set for the e2e run");
  await withDb((db) =>
    db.query(
      `UPDATE "OtpChallenge" SET "codeHash" = $1
       WHERE "id" = (SELECT "id" FROM "OtpChallenge" WHERE "phone" = $2 AND "consumedAt" IS NULL ORDER BY "createdAt" DESC LIMIT 1)`,
      [hashOtp(secret, e164, code), e164],
    ),
  );
}

export async function requestCode(page: Page, local: string) {
  await page.getByLabel("Mobile number").fill(local);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText("We sent a 6-digit code")).toBeVisible();
}

/** Full phone sign-in from wherever the page currently is (it must be on /sign-in). */
export async function completeSignIn(page: Page, mobile: { local: string; e164: string }) {
  await requestCode(page, mobile.local);
  await setKnownCode(mobile.e164, "246810");
  await page.getByLabel("6-digit code").fill("246810");
  await page.getByRole("button", { name: "Sign in" }).click();
}

export const PDF_FILE = (name: string) => ({ name, mimeType: "application/pdf", buffer: Buffer.from(`%PDF-1.4\n% ${name}\n`) });
export const PNG_FILE = (name: string) => ({
  name,
  mimeType: "image/png",
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
});
