import { expect, test } from "@playwright/test";
import { expectAccessible, newPage, unique, watchCsp } from "./helpers";
import { completeSignIn, emailFor, makeApprovedSeller, makeMemberLogin, randomMobile, signInMember, signInSeller, usernameFor, withDb } from "./member";
import { passwordOf, STAFF } from "./staff";

// Buyer and seller accounts: buyers make their own and sign in with its email (/sign-in); sellers sign in with the
// username and password the team gives an approved registration (/seller/sign-in). No Google, no self-service reset.

const GENERIC = "Username or password is incorrect, or the account is temporarily locked.";
const BUYER_GENERIC = "Email or password is incorrect, or the account is temporarily locked.";
// Several deliberately slow password hashes per test (argon2id): give them room on a busy machine.
test.describe.configure({ timeout: 90_000 });
const SLOW = { timeout: 20_000 };

test("seller pages send you to the seller sign-in, and the team's login brings you back", async ({ browser }) => {
  const page = await newPage(browser);
  const csp = watchCsp(page);
  await page.goto("/seller/companyverification");
  await expect(page).toHaveURL(/\/seller\/sign-in\?next=%2Fseller%2Fcompanyverification$/);
  await expect(page.getByRole("heading", { name: "Seller sign in" })).toBeVisible();
  await expectAccessible(page);

  const mobile = randomMobile();
  await completeSignIn(page, mobile);
  await expect(page).toHaveURL(/\/seller\/companyverification$/);
  await expect(page.getByRole("link", { name: "Your account" })).toBeVisible();
  await expect(page.getByLabel("Contact phone")).toHaveValue(mobile.e164); // from the account
  await expect(page.getByLabel("Contact email")).toHaveValue(emailFor(mobile));
  expect(csp).toEqual([]);
});

test("a seller's sign-in goes to their dashboard: first the way to company verification, then products", async ({ browser }) => {
  const mobile = randomMobile();
  await makeMemberLogin(mobile);
  const page = await newPage(browser);
  await page.goto("/seller/sign-in");
  await signInSeller(page, usernameFor(mobile).toUpperCase()); // any case
  await expect(page).toHaveURL(/\/seller\/dashboard$/, SLOW);
  await expect(page.getByRole("main").getByText(usernameFor(mobile), { exact: true })).toBeVisible(); // their profile
  await expectAccessible(page);
  await page.getByRole("link", { name: "Start company verification" }).click();
  await expect(page.getByRole("heading", { name: "Verify your company" })).toBeVisible();

  await makeApprovedSeller(mobile.e164, `E2E Sign-in Seller ${unique()}`);
  const again = await newPage(browser);
  await again.goto("/seller/sign-in");
  await signInSeller(again, usernameFor(mobile));
  await expect(again).toHaveURL(/\/seller\/dashboard$/, SLOW);
  await expect(again.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening), / })).toBeVisible();
  // Signed in as a seller: their profile instead of "Seller registration", and "Home" opens the dashboard.
  const banner = again.getByRole("banner");
  await expect(banner.getByRole("link", { name: "Seller registration" })).toHaveCount(0);
  await expect(banner.getByRole("link", { name: "Meera Desai" })).toHaveAttribute("href", "/seller/dashboard");
  await expect(banner.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/seller/dashboard");
  await again.getByRole("navigation", { name: "Seller" }).getByRole("link", { name: "Product listing" }).click();
  await expect(again.getByRole("heading", { name: "Your products" })).toBeVisible();
});

test("nobody can reset their own password: the sign-in pages point to each other, to sign-up and to registration", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/sign-in");
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveCount(0);
  await expect(page.getByText("Forgot your password? Contact the Harsol27 team.")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/sign-up");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Seller sign in" })).toHaveAttribute("href", "/seller/sign-in");
  await page.getByRole("main").getByRole("link", { name: "Seller sign in" }).click();
  await expect(page).toHaveURL(/\/seller\/sign-in$/);
  await page.getByRole("link", { name: "Register your business" }).click();
  await expect(page).toHaveURL(/\/Seller-Registration$/);

  for (const gone of ["/forgot-password", "/reset-password?token=abc", "/sign-in/google"]) {
    expect((await page.request.get(gone)).status(), gone).toBe(404);
  }
});

test("a buyer makes their own account with email and password, is signed in at once, and a used email is refused", async ({ browser }) => {
  const mobile = randomMobile();
  const email = `buyer.${mobile.local}@example.test`;
  const page = await newPage(browser);
  const csp = watchCsp(page);
  await page.goto("/sign-up?next=%2Faccount");
  await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
  await expect(page.getByLabel("Username")).toHaveCount(0); // buyers sign in with their email
  await expectAccessible(page);

  await page.getByLabel("Your name").fill("Meera Shah");
  await page.getByLabel("Mobile number").fill(mobile.local);
  await page.getByLabel("Email").fill(email);
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

  // Signs in again later with the same email.
  const later = await newPage(browser);
  await later.goto("/sign-in");
  await signInMember(later, email.toUpperCase(), "kite-season-2026"); // any case
  await expect(later).toHaveURL(/\/account$/, SLOW);

  // The same email again, from a fresh visit.
  const other = await newPage(browser);
  await other.goto("/sign-up");
  await other.getByLabel("Your name").fill("Someone Else");
  await other.getByLabel("Mobile number").fill(randomMobile().local);
  await other.getByLabel("Email").fill(email);
  await other.getByLabel("Password", { exact: true }).fill("kite-season-2026");
  await other.getByRole("button", { name: "Create account" }).click();
  await expect(other.getByText("An account with this email already exists.", { exact: false })).toBeVisible(SLOW);
});

test("buyer sign-in: email and password; a wrong password, a seller's username and a staff account get the same message", async ({ browser }) => {
  const mobile = randomMobile();
  await makeMemberLogin(mobile);
  const page = await newPage(browser);
  await page.goto("/sign-in");
  // "Sign in" looks inactive until both fields are filled in (but stays clickable).
  const button = page.getByRole("button", { name: "Sign in" });
  await expect(button).toHaveCSS("background-color", "rgb(251, 236, 214)"); // turmeric
  await signInMember(page, emailFor(mobile), "not-my-password");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(BUYER_GENERIC, SLOW);
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByLabel("Email")).toHaveValue(emailFor(mobile)); // kept for the next try
  await expect(button).toHaveCSS("background-color", "rgb(156, 47, 40)"); // kumkum

  // Staff can only sign in on the staff page: here a staff email and the right staff password fail like any other.
  await signInMember(page, STAFF.viewer.email, passwordOf(STAFF.viewer));
  await expect(page.getByRole("main").getByRole("alert")).toContainText(BUYER_GENERIC, SLOW);

  await signInMember(page, emailFor(mobile));
  await expect(page).toHaveURL(/\/account$/, SLOW);

  // On the seller page, a wrong password gets the username message.
  const seller = await newPage(browser);
  await seller.goto("/seller/sign-in");
  await signInSeller(seller, usernameFor(mobile), "not-my-password");
  await expect(seller.getByRole("main").getByRole("alert")).toContainText(GENERIC, SLOW);
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
