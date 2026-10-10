import { expect, test, type Browser, type Page } from "@playwright/test";
import { newPage, unique } from "./helpers";
import { completeSignIn, makeApprovedSeller, makeProduct, randomMobile, sellerOf, setSellerStatus } from "./member";
import { signInAs, STAFF } from "./staff";

// Who can open what. Every protected page is tried as every kind of user; each must land exactly
// where expected (the page itself, a sign-in page, or "not found"). The server decides, not the menu.

const MEMBER_PAGES = ["/account", "/account/inquiries", "/seller", "/seller/apply", "/seller/products", "/seller/products/new", "/seller/inquiries", "/seller/subscription"];
const SELLER_ONLY = ["/seller/products", "/seller/products/new", "/seller/inquiries", "/seller/subscription"];
const ADMIN_PAGES = ["/admin", "/admin/leads", "/admin/sellers", "/admin/products", "/admin/inquiries", "/admin/industries", "/admin/subscriptions"];
test.setTimeout(90_000); // each test opens every private page, several times over

const DOCUMENT = "/api/admin/documents/0199b5c0-0000-7000-8000-000000000001";

/** Opens `path` and returns where the browser ended up (path + query) and the status. */
async function land(page: Page, path: string): Promise<{ at: string; status: number }> {
  const response = await page.goto(path);
  const url = new URL(page.url());
  return { at: url.pathname + url.search, status: response?.status() ?? 0 };
}

async function member(browser: Browser) {
  const page = await newPage(browser);
  const mobile = randomMobile();
  await page.goto("/sign-in");
  await completeSignIn(page, mobile);
  return { page, mobile };
}

test("visitors are sent to the right sign-in page for everything private", async ({ browser }) => {
  const page = await newPage(browser);
  for (const path of MEMBER_PAGES) expect(await land(page, path), path).toEqual({ at: `/sign-in?next=${encodeURIComponent(path)}`, status: 200 });
  for (const path of [...ADMIN_PAGES, DOCUMENT]) expect((await land(page, path)).at, path).toBe("/staff/sign-in");
});

test("buyers and sellers reach their own pages only", async ({ browser }) => {
  // A buyer with no seller account: seller pages lead to the application.
  const buyer = await member(browser);
  for (const path of ["/account", "/account/inquiries", "/seller/apply"]) expect(await land(buyer.page, path), path).toEqual({ at: path, status: 200 });
  for (const path of ["/seller", ...SELLER_ONLY]) expect((await land(buyer.page, path)).at, path).toBe("/seller/apply");
  for (const path of ADMIN_PAGES) expect((await land(buyer.page, path)).at, path).toBe("/staff/sign-in");

  // An approved seller: every seller page, but never another seller's product, and no admin.
  const seller = await member(browser);
  await makeApprovedSeller(seller.mobile.e164, `Access Seller ${unique()}`);
  for (const path of MEMBER_PAGES.filter((p) => p !== "/seller/apply")) expect(await land(seller.page, path), path).toEqual({ at: path, status: 200 });
  const other = await member(browser);
  await makeApprovedSeller(other.mobile.e164, `Other Seller ${unique()}`);
  const othersProduct = await makeProduct((await sellerOf(other.mobile.e164)).id, `Other Product ${unique()}`);
  expect((await land(seller.page, `/seller/products/${othersProduct.id}`)).status).toBe(404);
  for (const path of [...ADMIN_PAGES, DOCUMENT]) expect((await land(seller.page, path)).at, path).toBe("/staff/sign-in");

  // Suspended (or still pending): back to the overview, which explains why.
  await setSellerStatus(seller.mobile.e164, "SUSPENDED");
  for (const path of SELLER_ONLY) expect((await land(seller.page, path)).at, path).toBe("/seller");
});

test("staff reach the admin area; staff sessions are not buyer accounts", async ({ browser }) => {
  for (const role of [STAFF.viewer, STAFF.admin]) {
    const page = await newPage(browser);
    await signInAs(page, role);
    for (const path of ADMIN_PAGES) expect(await land(page, path), `${role.role} ${path}`).toEqual({ at: path, status: 200 });
    expect((await land(page, DOCUMENT)).status, `${role.role} unknown document`).toBe(404);
    expect((await land(page, "/account")).at, role.role).toBe("/sign-in?next=%2Faccount");
  }
});
