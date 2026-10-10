import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { choose, expectAccessible, newPage, unique, watchCsp } from "./helpers";
import { completeSignIn, makeApprovedSeller, randomMobile } from "./member";
import { signInAs, STAFF } from "./staff";


const photo = async (color: string) => ({
  name: `${color.slice(1)}.jpg`,
  mimeType: "image/jpeg",
  buffer: await sharp({ create: { width: 1200, height: 900, channels: 3, background: color } }).jpeg().toBuffer(),
});

test("marketplace: a seller lists a product, a buyer finds it, inquires and gets the contact; staff moderate", async ({ browser }) => {
  test.setTimeout(90_000);
  const stamp = unique();
  const productName = `Methi Khakhra ${stamp}`;
  const company = `Patel Snacks ${stamp}`;

  // ── Seller: sign in, add a product with details and two photos ──
  const seller = await newPage(browser);
  const sellerCsp = watchCsp(seller);
  const sellerMobile = randomMobile();
  await seller.goto("/sign-in?next=/seller");
  await completeSignIn(seller, sellerMobile);
  const { contactPhone, contactEmail } = await makeApprovedSeller(sellerMobile.e164, company);
  await seller.goto("/seller");
  await expect(seller.getByText(/Active until/)).toBeVisible();
  await seller.getByRole("link", { name: "Manage products" }).click();
  await seller.getByRole("link", { name: "Add a product" }).click();

  await seller.getByRole("button", { name: "Create product and add photos" }).click();
  await expect(seller.getByText("Enter a product name of at least 3 characters.")).toBeVisible();
  await seller.getByLabel("Product name").fill(productName);
  await choose(seller, "Industry", "Food Products");
  await seller.getByLabel("Description").fill("Hand-roasted methi khakhra in 200 g pouches. Cartons of 40. Made fresh in Rajkot.");
  await seller.getByLabel("Detail 1 name").fill("Pack size");
  await seller.getByLabel("Detail 1 value").fill("200 g");
  await seller.getByRole("button", { name: "Create product and add photos" }).click();
  await expect(seller.getByText("Product created. Now add some photos.")).toBeVisible();
  await expectAccessible(seller);

  await seller.getByLabel("Add photos").setInputFiles([await photo("#c8743a"), await photo("#3a6ec8")]);
  await expect(seller.getByText("Main photo")).toBeVisible({ timeout: 30_000 });
  await expect(seller.getByRole("img", { name: "Photo 2" })).toBeVisible({ timeout: 30_000 }); // worker made the web sizes
  expect(sellerCsp).toEqual([]);

  // ── A visitor finds it; the contact is locked and NOT in the page at all ──
  const visitor = await newPage(browser);
  await visitor.goto("/");
  await visitor.getByLabel("Search products").fill(`khakhra ${stamp}`);
  await visitor.getByRole("button", { name: "Search" }).click();
  await expect(visitor.getByText("1 product")).toBeVisible();
  await expectAccessible(visitor);
  await visitor.getByRole("link", { name: new RegExp(productName) }).click();
  await expect(visitor.getByRole("heading", { level: 1, name: productName })).toBeVisible();
  await expect(visitor.getByRole("cell", { name: "200 g" })).toBeVisible();
  await expect(visitor.getByRole("link", { name: "Sign in to contact the seller" })).toBeVisible();
  const lockedHtml = await visitor.content();
  expect(lockedHtml).not.toContain(contactPhone);
  expect(lockedHtml).not.toContain(contactEmail);
  await expectAccessible(visitor);

  // ── The visitor signs in, sends an inquiry, and the contact unlocks ──
  await visitor.getByRole("link", { name: "Sign in to contact the seller" }).click();
  const buyerMobile = randomMobile();
  await completeSignIn(visitor, buyerMobile);
  await expect(visitor.getByRole("heading", { level: 1, name: productName })).toBeVisible();
  expect(await visitor.content()).not.toContain(contactPhone); // signed in is not enough
  await visitor.getByLabel("Your name").fill("Ravi Shah");
  await visitor.getByLabel("What do you need?").fill("Please quote for 100 cartons delivered to Ahmedabad.");
  await visitor.getByRole("button", { name: "Send inquiry and see contact details" }).click();
  await expect(visitor.getByRole("link", { name: contactPhone })).toBeVisible();
  await expect(visitor.getByRole("link", { name: contactEmail })).toBeVisible();
  await visitor.goto("/account/inquiries");
  await expect(visitor.getByRole("link", { name: company })).toBeVisible();
  await expect(visitor.getByRole("link", { name: contactPhone })).toBeVisible();

  // ── The seller sees the inquiry with the buyer's phone ──
  await seller.goto("/seller/inquiries");
  await expect(seller.getByText("Ravi Shah")).toBeVisible();
  await expect(seller.getByRole("link", { name: buyerMobile.e164 })).toBeVisible();

  // ── Staff remove the listing: it disappears from the public site; restoring brings it back ──
  const admin = await newPage(browser);
  await signInAs(admin, STAFF.admin);
  await admin.goto(`/admin/products?q=${encodeURIComponent(productName)}`);
  await admin.getByRole("link", { name: productName }).click();
  await expectAccessible(admin);
  await admin.getByLabel(/^Reason for removing/).fill("Test removal");
  await admin.getByRole("button", { name: "Remove listing" }).click();
  await admin.getByRole("dialog", { name: "Remove this listing?" }).getByRole("button", { name: "Remove listing" }).click();
  await expect(admin.getByRole("region", { name: "Moderation" }).getByRole("status")).toContainText("Listing removed.");
  const productUrl = await admin.getByRole("link", { name: "Product page" }).getAttribute("href");
  const anonymous = await newPage(browser);
  expect((await anonymous.goto(productUrl!))?.status()).toBe(404);
  await admin.getByRole("button", { name: "Restore listing" }).click();
  await expect(admin.getByRole("region", { name: "Moderation" }).getByRole("status")).toContainText("Listing restored.");
  expect((await anonymous.goto(productUrl!))?.status()).toBe(200);

  // ── The seller hides it: gone from search, and its photos are no longer served publicly ──
  const photoSrc = await anonymous.locator("main img").first().getAttribute("src");
  await seller.goto("/seller/products");
  await seller.getByRole("link", { name: productName }).click();
  await seller.getByRole("button", { name: "Hide from buyers" }).click();
  await expect(seller.getByText("This product is hidden")).toBeVisible();
  await anonymous.goto(`/search?q=${encodeURIComponent(productName)}`);
  await expect(anonymous.getByText("No products match")).toBeVisible();
  expect((await anonymous.request.get(photoSrc!)).status()).toBe(404);
  expect((await seller.request.get(photoSrc!)).status()).toBe(200); // the seller can still preview it
});

test("browse by industry and the sitemap only expose public pages", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/industries");
  await expect(page.getByRole("link", { name: /Food Products/ })).toBeVisible();
  await expectAccessible(page);
  const robots = await page.request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /admin");
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/industries/food-products");
  expect(sitemap).not.toContain("/admin");
});
