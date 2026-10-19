import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { withDb } from "./member";
import { expectGenericError, passwordOf, signIn, STAFF, uniqueIp } from "./staff";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

test("the admin area redirects visitors to staff sign-in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/staff\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Staff sign in" })).toBeVisible();
});

test("an admin signs in, gets full access, and signs out", async ({ page, context }) => {
  await signIn(page, STAFF.admin.email, passwordOf(STAFF.admin));
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("You have full access")).toBeVisible();

  const cookie = (await context.cookies()).find((c) => c.name.startsWith("harsol27"));
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/staff\/sign-in$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/staff\/sign-in$/);
});

test("a viewer signs in with view-only access", async ({ page }) => {
  await signIn(page, STAFF.viewer.email, passwordOf(STAFF.viewer));
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("You have view-only access")).toBeVisible();
});

test("wrong password and unknown email produce the identical message", async ({ page }) => {
  await signIn(page, STAFF.admin.email, "definitely-not-the-password");
  await expectGenericError(page);
  const wrongPassword = await page.locator("#sign-in-error").textContent();

  await signIn(page, "nobody@example.test", "definitely-not-the-password");
  await expectGenericError(page);
  expect(await page.locator("#sign-in-error").textContent()).toBe(wrongPassword);
});

test("five wrong passwords lock the account, even against the right password", async ({ page }) => {
  const email = "e2e-lockout@example.test";
  const password = "lockout-test-password-1";
  execFileSync("pnpm", ["--silent", "staff", "create", "--email", email, "--name", "Lockout", "--role", "VIEWER"], {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    input: `${password}\n`,
  });

  for (let i = 0; i < 5; i++) {
    await signIn(page, email, `wrong-password-${i}`);
    await expectGenericError(page);
  }
  await signIn(page, email, password);
  await expectGenericError(page);
  await expect(page).toHaveURL(/\/staff\/sign-in$/);
});

test("too many attempts from one IP are rate limited", async ({ page }) => {
  for (let i = 0; i < 10; i++) {
    await signIn(page, `nobody-${i}@example.test`, "x");
    await expectGenericError(page);
  }
  await signIn(page, STAFF.admin.email, passwordOf(STAFF.admin));
  await expect(page.locator("#sign-in-error")).toContainText("Too many sign-in attempts from your network");
});

test("forgot password (staff only): the emailed link sets a new password once, and ends other sessions", async ({ page, browser }) => {
  test.setTimeout(90_000); // several deliberately slow password hashes (argon2id)
  const email = `e2e-reset.${Date.now()}@example.test`; // its own account: the shared ones keep their passwords
  execFileSync("pnpm", ["--silent", "staff", "create", "--email", email, "--name", "Reset", "--role", "VIEWER"], {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    input: "first-staff-password-1\n",
  });
  const signedIn = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } });
  await signIn(signedIn, email, "first-staff-password-1");
  await expect(signedIn).toHaveURL(/\/admin$/);

  await page.goto("/staff/sign-in");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Forgot password" })).toBeVisible();
  // An unknown address gets exactly the same answer: nobody can find out who has an account.
  const nobody = `nobody.${Date.now()}@example.test`;
  await page.getByLabel("Email").fill(nobody);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText(`If a staff account uses ${nobody}, we have emailed it a link`);
  await page.reload();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText(`If a staff account uses ${email}, we have emailed it a link`);

  // The email itself goes out from the worker; the test reads the link's token from the database.
  const token = await withDb(async (db) => {
    const { rows } = await db.query(
      `SELECT v."identifier" FROM "Verification" v JOIN "User" u ON u."id"::text = v."value"
       WHERE u."email" = $1 AND v."identifier" LIKE 'reset-password:%' ORDER BY v."createdAt" DESC LIMIT 1`,
      [email],
    );
    return String((rows[0] as { identifier: string }).identifier).replace("reset-password:", "");
  });

  await page.goto(`/staff/reset-password?token=${token}`);
  await expect(page.getByText("At least 12 characters.")).toBeVisible(); // the staff rule (the browser and the server both hold it)
  await page.getByLabel("New password", { exact: true }).fill("a-brand-new-staff-password");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page).toHaveURL(/\/staff\/sign-in\?reset=1$/);
  await expect(page.getByRole("status")).toContainText("Your password has been changed");
  await signIn(page, email, "a-brand-new-staff-password");
  await expect(page).toHaveURL(/\/admin$/);

  // The session that was open elsewhere has ended, and the link works once.
  await signedIn.goto("/admin");
  await expect(signedIn).toHaveURL(/\/staff\/sign-in$/);
  await page.goto(`/staff/reset-password?token=${token}`);
  await page.getByLabel("New password", { exact: true }).fill("yet-another-staff-password");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("This reset link has expired or was already used");
});
