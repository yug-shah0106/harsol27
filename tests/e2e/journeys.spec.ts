import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { newPage, unique, watchCsp } from "./helpers";
import { completeSignIn, makeApprovedSeller, makeProduct, randomMobile, sellerOf } from "./member";
import { signInAs, STAFF } from "./staff";

// Journeys not covered elsewhere: editing a listing and its photos, contacting a seller from their
// profile, what staff see of inquiries, suspension, signing out, and the not-found page.

const photo = async (name: string, color: string) => ({
  name: `${name}.jpg`,
  mimeType: "image/jpeg",
  buffer: await sharp({ create: { width: 900, height: 900, channels: 3, background: color } }).jpeg().toBuffer(),
});

async function approvedSellerWithProduct(browser: Parameters<typeof newPage>[0], label: string) {
  const page = await newPage(browser);
  const mobile = randomMobile();
  await page.goto("/sign-in");
  await completeSignIn(page, mobile);
  const company = `${label} ${unique()}`;
  await makeApprovedSeller(mobile.e164, company);
  const seller = await sellerOf(mobile.e164);
  const product = await makeProduct(seller.id, `${label} Product ${unique()}`);
  return { page, company, seller, product };
}

test("a seller edits a listing, and reorders and deletes its photos", async ({ browser }) => {
  test.setTimeout(90_000);
  const { page, product } = await approvedSellerWithProduct(browser, "Editing Foods");
  const csp = watchCsp(page);
  await page.goto(`/seller/products/${product.id}`);

  await page.getByLabel("Description").fill("Now in 400 g family packs as well. Cartons of 20 or 40.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.getByLabel("Add photos").setInputFiles([await photo("one", "#b33a3a"), await photo("two", "#3ab35a"), await photo("three", "#3a5ab3")]);
  const photos = page.getByRole("list", { name: "Photos, in display order" }).locator("img");
  await expect(photos).toHaveCount(3, { timeout: 45_000 }); // the worker has made the web sizes
  const before = await photos.evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src")));

  await page.getByRole("button", { name: "Move photo 3 up" }).click();
  await expect.poll(() => photos.evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src")))).toEqual([before[0], before[2], before[1]]);
  await page.getByRole("button", { name: "Delete photo 1" }).click();
  await expect(photos).toHaveCount(2);
  expect(await photos.evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src")))).toEqual([before[2], before[1]]);

  const visitor = await newPage(browser);
  await visitor.goto(`/products/${product.slug}`);
  await expect(visitor.getByText("Now in 400 g family packs as well.")).toBeVisible();
  expect((await visitor.request.get(before[0]!)).status()).toBe(404); // the deleted photo is gone for good
  expect(csp).toEqual([]);
});

test("a buyer contacts a seller from their profile; the seller and staff see the inquiry, only staff see its source", async ({ browser }) => {
  const { page: sellerPage, company, seller, product } = await approvedSellerWithProduct(browser, "Profile Brass");
  const buyerName = `Profile Buyer ${unique()}`;

  const visitor = await newPage(browser);
  await visitor.goto(`/sellers/${seller.slug}`);
  await expect(visitor.getByRole("heading", { level: 1, name: company })).toBeVisible();
  await expect(visitor.getByRole("link", { name: new RegExp(product.slug.split("-").slice(0, 3).join(" "), "i") })).toBeVisible();
  await visitor.getByRole("link", { name: "Sign in to contact the seller" }).click();
  await completeSignIn(visitor, randomMobile());
  await visitor.getByLabel("Your name").fill(buyerName);
  await visitor.getByLabel("What do you need?").fill("Do you make brass door handles in bulk?");
  await visitor.getByRole("button", { name: "Send inquiry and see contact details" }).click();
  await expect(visitor.getByRole("link", { name: /^\+91/ })).toBeVisible();

  await sellerPage.goto("/seller/inquiries");
  await expect(sellerPage.getByText(buyerName)).toBeVisible();
  await expect(sellerPage.getByText(/^IP /)).toHaveCount(0);

  for (const role of [STAFF.admin, STAFF.viewer]) {
    const staff = await newPage(browser);
    await signInAs(staff, role);
    await staff.goto(`/admin/inquiries?q=${encodeURIComponent(buyerName)}`);
    await expect(staff.getByText(buyerName)).toBeVisible();
    await expect(staff.getByText(/IP 10\.\d+\.\d+\.\d+/)).toBeVisible();
  }
});

test("suspending a seller takes their listings off the site; reinstating brings them back", async ({ browser }) => {
  const { seller, product } = await approvedSellerWithProduct(browser, "Suspended Steel");
  const visitor = await newPage(browser);
  expect((await visitor.goto(`/products/${product.slug}`))?.status()).toBe(200);

  const admin = await newPage(browser);
  await signInAs(admin, STAFF.admin);
  await admin.goto(`/admin/sellers/${seller.id}`);
  await admin.getByLabel(/^Reason/).fill("Documents expired");
  await admin.getByRole("button", { name: "Suspend" }).click();
  await expect(admin.getByText("Decision saved. The seller will be emailed.")).toBeVisible();

  expect((await visitor.goto(`/products/${product.slug}`))?.status()).toBe(404);
  expect((await visitor.goto(`/sellers/${seller.slug}`))?.status()).toBe(404);

  await admin.getByRole("button", { name: "Reinstate" }).click();
  await expect(admin.getByText("Suspended → Approved")).toBeVisible();
  expect((await visitor.goto(`/products/${product.slug}`))?.status()).toBe(200);
});

test("a member signs out, and their account pages need signing in again", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/sign-in?next=/account");
  await completeSignIn(page, randomMobile());
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Faccount$/);
});

test("a missing page answers 404 with a helpful page", async ({ page }) => {
  const csp = watchCsp(page);
  expect((await page.goto("/products/no-such-product"))?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Search products" }).first()).toBeVisible();
  expect(csp).toEqual([]);
});

test("the main journey works with the keyboard alone: search from the home page, open a result", async ({ browser }) => {
  const { product } = await approvedSellerWithProduct(browser, "Keyboard Snacks");
  const page = await newPage(browser);
  await page.goto("/");
  await page.keyboard.press("Tab"); // skip link
  await page.keyboard.press("Enter");
  const search = page.getByRole("searchbox", { name: "Search products" });
  for (let i = 0; i < 10 && !(await search.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(search).toBeFocused();
  await page.keyboard.type(product.slug.split("-").slice(0, 4).join(" "));
  await page.keyboard.press("Enter");
  await expect(page.getByText("1 product")).toBeVisible();

  const result = page.getByRole("main").getByRole("link", { name: /Keyboard Snacks Product/ });
  for (let i = 0; i < 40 && !(await result.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(result).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: /Keyboard Snacks Product/ })).toBeVisible();
});

