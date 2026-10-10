import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, newPage, unique, watchCsp } from "./helpers";
import { completeSignIn, makeApprovedSeller, makeInquiry, makeLead, makeProduct, randomMobile, sellerOf } from "./member";
import { signInAs, STAFF } from "./staff";

// Every page, as every kind of user: no automatically detectable WCAG 2.1 A/AA problem, and nothing
// blocked by the Content Security Policy (which would show up as a broken or unstyled page).

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000); // each test visits many pages; on a busy machine that takes a while

let fixture: { sellerPage: Page; buyerPage: Page; product: { id: string; slug: string }; sellerId: string; sellerSlug: string; leadId: string };

test.beforeAll(async ({ browser }) => {
  const stamp = unique();
  const sellerPage = await newPage(browser);
  const seller = randomMobile();
  await sellerPage.goto("/sign-in");
  await completeSignIn(sellerPage, seller);
  await makeApprovedSeller(seller.e164, `Sweep Traders ${stamp}`);
  const { id: sellerId, slug: sellerSlug } = await sellerOf(seller.e164);
  const product = await makeProduct(sellerId, `Sweep Khakhra ${stamp}`);

  const buyerPage = await newPage(browser);
  const buyer = randomMobile();
  await buyerPage.goto("/sign-in");
  await completeSignIn(buyerPage, buyer);
  await makeInquiry(buyer.e164, sellerId, product.id);

  fixture = { sellerPage, buyerPage, product, sellerId, sellerSlug, leadId: await makeLead(`Sweep Lead ${stamp}`) };
});

async function sweep(page: Page, paths: string[]) {
  const csp = watchCsp(page);
  for (const path of paths) {
    await page.goto(path);
    await expect(page.locator("h1").first(), path).toBeVisible();
    await test.step(path, () => expectAccessible(page));
  }
  expect(csp).toEqual([]);
}

test("visitor pages", async ({ browser }) => {
  const { product, sellerSlug } = fixture;
  await sweep(await newPage(browser), [
    "/search",
    "/search?q=khakhra",
    "/industries",
    "/industries/food-products",
    `/products/${product.slug}`,
    `/sellers/${sellerSlug}`,
    "/sign-in",
    "/staff/sign-in",
    "/this-page-does-not-exist",
  ]);
});

test("buyer and seller pages", async ({ browser }) => {
  await sweep(fixture.buyerPage, ["/account", "/account/inquiries", `/products/${fixture.product.slug}`, "/seller/apply"]);
  await sweep(fixture.sellerPage, ["/seller", "/seller/products", "/seller/products/new", `/seller/products/${fixture.product.id}`, "/seller/inquiries", "/seller/subscription"]);
  const fresh = await newPage(browser); // the application form, before applying
  await fresh.goto("/sign-in");
  await completeSignIn(fresh, randomMobile());
  await sweep(fresh, ["/seller/apply"]);
});

test("admin and viewer pages", async ({ browser }) => {
  const { product, sellerId, leadId } = fixture;
  const pages = [
    "/admin",
    "/admin/leads",
    `/admin/leads/${leadId}`,
    "/admin/sellers",
    `/admin/sellers/${sellerId}`,
    "/admin/products",
    `/admin/products/${product.id}`,
    "/admin/inquiries",
    "/admin/industries",
    "/admin/subscriptions",
    "/admin/subscriptions?view=active",
  ];
  for (const role of [STAFF.admin, STAFF.viewer]) {
    const page = await newPage(browser);
    await signInAs(page, role);
    await sweep(page, pages);
  }
});
