import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

/** A random, valid Indian mobile number: "98xxxxxxxx" (local form) and its E.164 form. */
export function randomMobile(): { local: string; e164: string } {
  const local = `98${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
  return { local, e164: `+91${local}` };
}

export async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export const MEMBER_PASSWORD = "kite-season-2026";
/** The email the test account for a mobile number signs up with. */
export const emailFor = (mobile: { local: string }) => `member.${mobile.local}@example.test`;

/**
 * Creates a buyer/seller account through the real "Create an account" form, starting from the sign-in
 * page (where a protected page sends you), and lands wherever sign-in was meant to go. The mobile
 * number identifies the member in the database helpers below.
 */
export async function completeSignIn(page: Page, mobile: { local: string; e164: string }) {
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Your name").fill("Meera Desai");
  await page.getByLabel("Email").fill(emailFor(mobile));
  await page.getByLabel("Mobile number").fill(mobile.local);
  await page.getByLabel("Password").fill(MEMBER_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).not.toHaveURL(/\/(sign-in|sign-up)/, { timeout: 20_000 }); // signed in and sent on (password hashing is slow by design)
}

/** Signs an existing member in with email and password (the page must be on /sign-in). */
export async function signInMember(page: Page, email: string, password = MEMBER_PASSWORD) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
}

export const PDF_FILE = (name: string) => ({ name, mimeType: "application/pdf", buffer: Buffer.from(`%PDF-1.4\n% ${name}\n`) });
export const PNG_FILE = (name: string) => ({
  name,
  mimeType: "image/png",
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
});

/**
 * Turns a signed-in member into an approved seller directly in the database, paid up for 30 days
 * unless told otherwise (null = no payment yet). Approval has its own test; this keeps the others focused.
 */
export async function makeApprovedSeller(e164: string, company: string, paidForDays: number | null = 30): Promise<{ contactPhone: string; contactEmail: string }> {
  const contactPhone = `+9179${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
  const contactEmail = `sales.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@seller.example.test`;
  await withDb((db) =>
    db.query(
      `INSERT INTO "Seller" ("id","userId","companyName","slug","city","state","contactName","contactPhone","contactEmail","status","paidUntil","createdAt","updatedAt")
       SELECT gen_random_uuid(), "id", $2, $3, 'Rajkot', 'Gujarat', 'Kiran Patel', $4, $5, 'APPROVED', current_date + $6::int, now(), now()
       FROM "User" WHERE "mobile" = $1`,
      [e164, company, `${company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 7)}`, contactPhone, contactEmail, paidForDays],
    ),
  );
  return { contactPhone, contactEmail };
}

/** The seller id for a member's phone (after makeApprovedSeller). */
export async function sellerOf(e164: string): Promise<{ id: string; slug: string }> {
  const { rows } = await withDb((db) => db.query(`SELECT s."id", s."slug" FROM "Seller" s JOIN "User" u ON u."id" = s."userId" WHERE u."mobile" = $1`, [e164]));
  return rows[0] as { id: string; slug: string };
}

/** A listed product (no photos) for a seller, in "Food Products". */
export async function makeProduct(sellerId: string, name: string): Promise<{ id: string; slug: string }> {
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 7)}`;
  const { rows } = await withDb((db) =>
    db.query(
      `INSERT INTO "Product" ("id","sellerId","industryId","name","slug","description","specifications","createdAt","updatedAt")
       SELECT gen_random_uuid(), $1, i."id", $2, $3, 'Fresh stock, packed in cartons of 40. Delivery across Gujarat.', '[{"label":"Pack size","value":"200 g"}]', now(), now()
       FROM "Industry" i WHERE i."slug" = 'food-products' RETURNING "id", "slug"`,
      [sellerId, name, slug],
    ),
  );
  return rows[0] as { id: string; slug: string };
}

/** An inquiry from a signed-in buyer (by phone) about a product. */
export async function makeInquiry(buyerE164: string, sellerId: string, productId: string): Promise<void> {
  await withDb((db) =>
    db.query(
      `INSERT INTO "Inquiry" ("id","buyerId","sellerId","productId","message","buyerName","buyerPhone","sourceIp","createdAt")
       SELECT gen_random_uuid(), u."id", $2, $3, 'Please quote for 100 cartons.', 'Meera Desai', $1, '203.0.113.7', now() FROM "User" u WHERE u."mobile" = $1`,
      [buyerE164, sellerId, productId],
    ),
  );
}

/** A new lead, as if submitted through the form. */
export async function makeLead(fullName: string): Promise<string> {
  const { rows } = await withDb((db) =>
    db.query(
      `INSERT INTO "Lead" ("id","fullName","phone","email","businessCategory","industryId","createdAt","updatedAt")
       SELECT gen_random_uuid(), $1, '+919876500000', 'lead@example.test', 'MANUFACTURING', i."id", now(), now() FROM "Industry" i WHERE i."slug" = 'food-products' RETURNING "id"`,
      [fullName],
    ),
  );
  return (rows[0] as { id: string }).id;
}

export async function setSellerStatus(e164: string, status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED"): Promise<void> {
  await withDb((db) => db.query(`UPDATE "Seller" SET "status" = $2 WHERE "userId" = (SELECT "id" FROM "User" WHERE "mobile" = $1)`, [e164, status]));
}

/** Replaces the backup history with one run that ended just now (ok or failed), or with none. */
export async function setLastBackup(ok: boolean | null): Promise<void> {
  await withDb(async (db) => {
    await db.query(`DELETE FROM "BackupRun"`);
    if (ok !== null) {
      await db.query(
        `INSERT INTO "BackupRun" ("id","startedAt","finishedAt","ok","fileName","restoreChecked") VALUES (gen_random_uuid(), timezone('UTC', now()), timezone('UTC', now()), $1, 'e2e.dump', $1)`,
        [ok],
      );
    }
  });
}

