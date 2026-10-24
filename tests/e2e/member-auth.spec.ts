import { expect, test } from "@playwright/test";
import { expectAccessible, newPage, watchCsp } from "./helpers";
import { completeSignIn, emailFor, makeMemberLogin, randomMobile, signInMember, usernameFor, withDb } from "./member";
import { passwordOf, STAFF } from "./staff";

// Buyer and seller accounts: buyers make their own (since 2026-10-24); sellers get a username and password from
// the team for an approved registration. No Google sign-in and no self-service reset (SMS sign-in is off too).

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

test("nobody can reset their own password: the sign-in page points to buyer sign-up and to seller registration", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/sign-in");
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveCount(0);
  await expect(page.getByText("Forgot your password? Contact the Harsol27 team.")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/sign-up");
  await page.getByRole("link", { name: "Register your business" }).click();
  await expect(page).toHaveURL(/\/Seller-Registration$/);

  for (const gone of ["/forgot-password", "/reset-password?token=abc", "/sign-in/google"]) {
    expect((await page.request.get(gone)).status(), gone).toBe(404);
  }
});

test("a buyer makes their own account, is signed in at once, and a taken username is refused", async ({ browser }) => {
  const mobile = randomMobile();
  const username = `b${mobile.local.slice(-9)}`;
  const page = await newPage(browser);
  const csp = watchCsp(page);
  await page.goto("/sign-up?next=%2Faccount");
  await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
  await expectAccessible(page);

  await page.getByLabel("Your name").fill("Meera Shah");
  await page.getByLabel("Mobile number").fill(mobile.local);
  await page.getByLabel("Email").fill(`${username}@example.com`);
  await page.getByLabel("Username").fill(username);
  // Too short: the browser's own check stops it (the server says the same, translated, if it ever gets through).
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  expect(await page.getByLabel("Password", { exact: true }).evaluate((el: HTMLInputElement) => el.validity.tooShort)).toBe(true);
  await expect(page).toHaveURL(/\/sign-up\?next=%2Faccount$/);

  await page.getByLabel("Password", { exact: true }).fill("kite-season-2026");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/, SLOW);
  await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Register your business" })).toBeVisible(); // a buyer: selling starts with a registration
  expect(csp).toEqual([]);

  // The same username again, from a fresh visit.
  const other = await newPage(browser);
  await other.goto("/sign-up");
  await other.getByLabel("Your name").fill("Someone Else");
  await other.getByLabel("Mobile number").fill(randomMobile().local);
  await other.getByLabel("Email").fill(`other.${username}@example.com`);
  await other.getByLabel("Username").fill(username);
  await other.getByLabel("Password", { exact: true }).fill("kite-season-2026");
  await other.getByRole("button", { name: "Create account" }).click();
  await expect(other.getByText("That username is taken. Try another.")).toBeVisible(SLOW);
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
