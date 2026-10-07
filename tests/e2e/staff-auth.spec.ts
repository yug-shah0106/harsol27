import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
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
