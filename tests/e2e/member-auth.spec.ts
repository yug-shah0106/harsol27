import { expect, test } from "@playwright/test";
import { expectAccessible, newPage, watchCsp } from "./helpers";
import { completeSignIn, emailFor, MEMBER_PASSWORD, randomMobile, signInMember, withDb } from "./member";
import { passwordOf, STAFF } from "./staff";

// Buyer and seller accounts: email and password (SMS sign-in is switched off), and Google.

const GENERIC = "Email or password is incorrect, or the account is temporarily locked.";
// Several deliberately slow password hashes per test (argon2id): give them room on a busy machine.
test.describe.configure({ timeout: 90_000 });
const SLOW = { timeout: 20_000 };

test("protected pages send you to sign in, and creating an account brings you back", async ({ browser }) => {
  const page = await newPage(browser);
  const csp = watchCsp(page);
  await page.goto("/seller/apply");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fseller%2Fapply$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expectAccessible(page);

  const mobile = randomMobile();
  await completeSignIn(page, mobile);
  await expect(page).toHaveURL(/\/seller\/apply$/);
  await expect(page.getByRole("link", { name: "Your account" })).toBeVisible();
  await expect(page.getByLabel("Contact phone")).toHaveValue(mobile.e164); // from the account
  await expect(page.getByLabel("Contact email")).toHaveValue(emailFor(mobile));
  expect(csp).toEqual([]);
});

test("create account: a mistake is shown on its field, and an email can only be used once", async ({ browser }) => {
  const page = await newPage(browser);
  const mobile = randomMobile();
  await page.goto("/sign-up");
  await expectAccessible(page);
  await page.getByLabel("Your name").fill("Meera Desai");
  await page.getByLabel("Email").fill(emailFor(mobile));
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByLabel("Password", { exact: true }).fill(MEMBER_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  const field = page.getByLabel("Mobile number");
  await expect(page.getByText("Enter a valid phone number")).toBeVisible(SLOW);
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toBeFocused();
  await expect(page.getByLabel("Your name")).toHaveValue("Meera Desai"); // what they typed is kept

  await field.fill(mobile.local);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/, SLOW);
  await expect(page.getByText(`Signed in as ${emailFor(mobile)}`)).toBeVisible();
  await expect(page.getByText(`Mobile number for sellers: ${mobile.e164}`)).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible(SLOW); // signed out
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Someone Else");
  await page.getByLabel("Email").fill(emailFor(mobile).toUpperCase()); // same address, any case
  await page.getByLabel("Mobile number").fill(randomMobile().local);
  await page.getByLabel("Password", { exact: true }).fill("another-password-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("An account with this email already exists").first()).toBeVisible(SLOW);
  await expect(page.getByLabel("Email")).toBeFocused();
});

test("sign in: email and password; a wrong password and a staff account get the same message", async ({ browser }) => {
  const first = await newPage(browser);
  const mobile = randomMobile();
  await first.goto("/sign-in");
  await completeSignIn(first, mobile);

  const page = await newPage(browser);
  await page.goto("/sign-in");
  // "Continue" looks inactive until both fields are filled in (but stays clickable).
  const button = page.getByRole("button", { name: "Continue" });
  await expect(button).toHaveCSS("background-color", "rgb(237, 232, 224)"); // stone
  await signInMember(page, emailFor(mobile), "not-my-password");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(GENERIC, SLOW);
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByLabel("Email")).toHaveValue(emailFor(mobile)); // kept for the next try
  await expect(button).toHaveCSS("background-color", "rgb(86, 102, 79)"); // olive

  // Staff can only sign in on the staff page: here the right staff password fails like any other.
  await signInMember(page, STAFF.viewer.email, passwordOf(STAFF.viewer));
  await expect(page.getByRole("main").getByRole("alert")).toContainText(GENERIC, SLOW);

  await signInMember(page, emailFor(mobile));
  await expect(page).toHaveURL(/\/account$/, SLOW);
});

test("forgot password: the emailed link sets a new password once, and ends other sessions", async ({ browser }) => {
  const signedIn = await newPage(browser);
  const mobile = randomMobile();
  await signedIn.goto("/sign-in");
  await completeSignIn(signedIn, mobile);

  const page = await newPage(browser);
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Forgot password" })).toBeVisible();
  await expectAccessible(page);

  // An unknown address gets exactly the same answer: nobody can find out who has an account.
  const nobody = `nobody.${mobile.local}@example.test`; // unique: the per-address limit is 3 an hour
  await page.getByLabel("Email").fill(nobody);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText(`If an account uses ${nobody}, we have emailed it a link`, SLOW);
  await page.reload();
  await page.getByLabel("Email").fill(emailFor(mobile));
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText(`If an account uses ${emailFor(mobile)}, we have emailed it a link`, SLOW);

  // The email itself goes out from the worker; the test reads the link's token from the database.
  const token = await withDb(async (db) => {
    const { rows } = await db.query(
      `SELECT v."identifier" FROM "Verification" v JOIN "User" u ON u."id"::text = v."value"
       WHERE u."email" = $1 AND v."identifier" LIKE 'reset-password:%' ORDER BY v."createdAt" DESC LIMIT 1`,
      [emailFor(mobile)],
    );
    return String((rows[0] as { identifier: string }).identifier).replace("reset-password:", "");
  });

  await page.goto(`/reset-password?token=${token}`);
  await expectAccessible(page);
  await page.getByLabel("New password", { exact: true }).fill("a-brand-new-password");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page).toHaveURL(/\/sign-in\?reset=1$/, SLOW);
  await expect(page.getByRole("status")).toContainText("Your password has been changed", SLOW);
  await signInMember(page, emailFor(mobile), "a-brand-new-password");
  await expect(page).toHaveURL(/\/account$/, SLOW);

  // The session that was open elsewhere has ended.
  await signedIn.goto("/account");
  await expect(signedIn).toHaveURL(/\/sign-in\?next=%2Faccount$/);

  // The link works once.
  await page.goto(`/reset-password?token=${token}`);
  await page.getByLabel("New password", { exact: true }).fill("yet-another-password");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("This reset link has expired or was already used", SLOW);
});

test("Google: the button sends you to Google with our return address; a broken return lands on sign in", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/sign-in?next=%2Fseller");
  const google = page.getByRole("link", { name: "Continue with Google" });
  await expect(google).toBeVisible();

  await page.route(/^https:\/\/accounts\.google\.com\//, (route) => route.fulfill({ status: 200, contentType: "text/plain", body: "Google" }));
  const request = page.waitForRequest(/^https:\/\/accounts\.google\.com\//);
  await google.click();
  const url = new URL((await request).url());
  expect(url.pathname).toMatch(/^\/o\/oauth2\//);
  expect(url.searchParams.get("client_id")).toBe("e2e-google-client.apps.googleusercontent.com");
  expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3217/api/auth/callback/google");
  expect(url.searchParams.get("state")).toBeTruthy();

  // Coming back without a valid state (forged or expired): no session, and a plain message.
  const fresh = await newPage(browser);
  await fresh.goto("/api/auth/callback/google?state=forged&code=forged");
  await expect(fresh).toHaveURL(/\/sign-in\?error=/);
  await expect(fresh.getByRole("main").getByRole("alert")).toContainText("Signing in with Google did not work");
});

test("a member without a mobile number (a Google sign-up) is asked for one before member pages", async ({ browser }) => {
  const page = await newPage(browser);
  const mobile = randomMobile();
  await page.goto("/sign-in");
  await completeSignIn(page, mobile);
  await withDb((db) => db.query(`UPDATE "User" SET "mobile" = NULL WHERE "email" = $1`, [emailFor(mobile)]));

  await page.goto("/account");
  await expect(page).toHaveURL(/\/account\/mobile\?next=%2Faccount$/);
  await expect(page.getByRole("heading", { name: "Add your mobile number" })).toBeVisible();
  await expectAccessible(page);
  await page.getByLabel("Mobile number").fill(mobile.local);
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/account$/, SLOW);
  await expect(page.getByText(`Mobile number for sellers: ${mobile.e164}`)).toBeVisible();
});
