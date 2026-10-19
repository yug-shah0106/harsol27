import { expect, test } from "@playwright/test";
import { expectAccessible, newPage, watchCsp } from "./helpers";
import { completeSignIn, emailFor, makeMemberLogin, randomMobile, signInMember, usernameFor, withDb } from "./member";
import { passwordOf, STAFF } from "./staff";

// Buyer and seller accounts: the username and password the team gives an approved registration. There is
// no "Create an account", Google or self-service reset (SMS sign-in is switched off too).

const GENERIC = "Username or password is incorrect, or the account is temporarily locked.";
// Several deliberately slow password hashes per test (argon2id): give them room on a busy machine.
test.describe.configure({ timeout: 90_000 });
const SLOW = { timeout: 20_000 };

test("protected pages send you to sign in, and a login from the team brings you back", async ({ browser }) => {
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

test("nobody can make their own account or reset their own password: the sign-in page points to registration", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/sign-in");
  await expect(page.getByRole("link", { name: "Create an account" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveCount(0);
  await expect(page.getByText("Forgot your password? Contact the Harsol27 team.")).toBeVisible();
  await page.getByRole("link", { name: "Register as a seller" }).click();
  await expect(page).toHaveURL(/\/Seller-Registration$/);

  for (const gone of ["/sign-up", "/forgot-password", "/reset-password?token=abc", "/sign-in/google"]) {
    expect((await page.request.get(gone)).status(), gone).toBe(404);
  }
});

test("sign in: username and password; a wrong password and a staff account get the same message", async ({ browser }) => {
  const mobile = randomMobile();
  await makeMemberLogin(mobile);
  const page = await newPage(browser);
  await page.goto("/sign-in");
  // "Sign in" looks inactive until both fields are filled in (but stays clickable).
  const button = page.getByRole("button", { name: "Sign in" });
  await expect(button).toHaveCSS("background-color", "rgb(251, 236, 214)"); // turmeric
  await signInMember(page, usernameFor(mobile), "not-my-password");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(GENERIC, SLOW);
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByLabel("Username")).toHaveValue(usernameFor(mobile)); // kept for the next try
  await expect(button).toHaveCSS("background-color", "rgb(156, 47, 40)"); // kumkum

  // Staff can only sign in on the staff page: here a staff email and the right staff password fail like any other.
  await signInMember(page, STAFF.viewer.email, passwordOf(STAFF.viewer));
  await expect(page.getByRole("main").getByRole("alert")).toContainText(GENERIC, SLOW);

  await signInMember(page, usernameFor(mobile).toUpperCase()); // any case
  await expect(page).toHaveURL(/\/account$/, SLOW);
});

test("a member without a mobile number is asked for one before member pages", async ({ browser }) => {
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
