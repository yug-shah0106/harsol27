import { expect, test } from "@playwright/test";
import { addPaymentScreenshot, choose, fillAddress, expectAccessible, fillLeadForm, sendClientIp, unique, watchCsp } from "./helpers";
import { withDb } from "./member";

test.beforeEach(async ({ context }) => {
  await sendClientIp(context);
});

test("home page: real HTML hero, seeded industries, how it works, call to action", async ({ page }) => {
  const csp = watchCsp(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Find the right supplier");
  await expect(page.getByRole("heading", { name: "Industries on Harsol27" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Food Products" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await page.getByRole("link", { name: "Get started" }).first().click();
  await expect(page).toHaveURL(/\/Seller-Registration$/);
  expect(csp).toEqual([]);
});

test("the first Tab press reaches the skip link, which jumps to the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

for (const path of ["/", "/about", "/terms", "/privacy", "/Seller-Registration"]) {
  test(`${path} has no detectable WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);
    await expectAccessible(page);
  });
}

test("lead form: client-side errors are announced with text and focus the first problem", async ({ page }) => {
  await page.goto("/Seller-Registration");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByLabel("First name")).toBeFocused();
  for (const message of ["Enter your first name.", "Enter your last name.", "Enter your city.", "Choose your state.", "Enter your pincode.", "Choose a category.", "Choose an industry."]) {
    await expect(page.getByText(message)).toBeVisible();
  }
  await expect(page.getByLabel("First name")).toHaveAttribute("aria-invalid", "true");
  await expectAccessible(page); // error state must be accessible too

  await page.getByLabel("WhatsApp number").fill("12345");
  await page.getByLabel("Pincode").fill("38001");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Enter a valid WhatsApp number")).toBeVisible();
  await expect(page.getByText("Enter a 6-digit pincode, like 380001.")).toBeVisible();
});

test("lead form: a valid submission shows a confirmation", async ({ page }) => {
  const csp = watchCsp(page);
  await page.goto("/Seller-Registration");
  await fillLeadForm(page, {
    name: "Public Journey",
    phone: "98250 12345",
    email: `public.${unique()}@example.test`,
    category: "Manufacturers",
    industry: "Food Products",
  });
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("status")).toContainText("We have received your details");
  expect(csp).toEqual([]);
});

test("public pages tell search engines and link previews what they are", async ({ page }) => {
  // [page, its canonical address]; /coming-soon is served at "/" before launch.
  for (const [path, canonical] of [["/", "/"], ["/coming-soon", "/"], ["/Seller-Registration", "/Seller-Registration"], ["/about", "/about"], ["/terms", "/terms"], ["/privacy", "/privacy"], ["/industries", "/industries"], ["/industries/food-products", "/industries/food-products"]] as const) {
    await page.goto(path);
    const meta = (name: string) => page.locator(`meta[name="${name}"], meta[property="${name}"]`).getAttribute("content");
    const title = await page.title();
    expect(title, path).toContain("Harsol27");
    expect(title.length, `${path} title: ${title}`).toBeLessThanOrEqual(60);
    const description = (await meta("description"))!;
    expect(description.length, `${path} description: ${description}`).toBeGreaterThanOrEqual(100);
    expect(description.length, `${path} description: ${description}`).toBeLessThanOrEqual(160);
    expect(await meta("keywords"), path).toContain("B2B marketplace Harsol");
    expect(await page.locator('link[rel="canonical"]').getAttribute("href"), path).toMatch(new RegExp(`^https?://[^/]+${canonical === "/" ? "/?" : canonical}$`));
    expect(await meta("og:title"), path).toContain("Harsol27");
    expect(await meta("og:description"), path).toBe(description);
    expect(await meta("og:image"), path).toMatch(/\/og-image\.png$/);
  }
  const image = await page.request.get("/og-image.png");
  expect(image.headers()["content-type"]).toBe("image/png");
});

test("the Seller registration form is at /Seller-Registration, and its old and lowercase addresses lead there", async ({ page }) => {
  for (const path of ["/get-started", "/Pre-Registration", "/pre-registration", "/seller-registration", "/Seller-Registration"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/Seller-Registration$/);
    await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
  }
});

test("lead form: the fee is paid by the client's UPI QR code, UPI ID or bank account, and the QR code can be saved for a UPI app", async ({ page }) => {
  await page.goto("/Seller-Registration");
  const qr = page.getByRole("img", { name: "UPI QR code for paying Shree Harsol Sattavis Jain Yuvak Trust" });
  await expect.poll(() => qr.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  for (const detail of ["9152000352m@pnb", "09952191031725", "PUNB0099510"]) await expect(page.getByText(detail, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy IFSC" })).toBeVisible();
  const saved = await page.request.get((await page.getByRole("link", { name: "Save the QR code" }).getAttribute("href"))!);
  expect(saved.headers()["content-type"]).toBe("image/png"); // UPI apps open photos, not SVG files
});

test("lead form: a native place and an industry that aren't listed are chosen as Other and typed in", async ({ page }) => {
  const email = `other.${unique()}@example.test`;
  await page.goto("/Seller-Registration");
  await page.getByLabel("First name").fill("Kiran");
  await page.getByLabel("Father's name").fill("Mahesh");
  await page.getByLabel("Last name").fill("Shah");
  await choose(page, "Native place", "Other (not listed)");
  await page.getByLabel("Your native place").fill("Talod");
  await fillAddress(page, "Himatnagar");
  await page.getByLabel("WhatsApp number").fill("98250 54321");
  await page.getByLabel("Email").fill(email);
  await choose(page, "Category", "Services");

  // One industry: searching finds nothing for it, so "Other" (always listed) and their own words.
  const industry = page.getByRole("combobox", { name: "Industry", exact: true });
  await industry.click();
  await page.getByRole("searchbox", { name: "Search industries" }).fill("solar");
  await expect(page.getByRole("listbox", { name: "Industry" }).getByRole("option")).toHaveText(["Other (not listed)"]); // nothing matches, Other stays
  await page.keyboard.press("Enter"); // chooses it and closes the list
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(industry).toHaveText("Other (not listed)");
  const own = page.getByLabel("Your industry");
  await addPaymentScreenshot(page);

  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Tell us your industry.")).toBeVisible();
  await own.fill("Solar panels");
  await page.getByLabel("Instagram").fill("not a handle!");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Enter your Instagram name, like @yourshop.")).toBeVisible();
  await page.getByLabel("Instagram").fill("@kiran.solar");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("status")).toContainText("We have received your details");

  const { rows } = await withDb((db) =>
    db.query(
      `SELECT l."nativePlace", l."industryOther", l."instagram", (SELECT count(*)::int FROM "_IndustryToLead" li WHERE li."B" = l."id") AS industries
       FROM "Lead" l WHERE l."email" = $1`,
      [email],
    ),
  );
  expect(rows).toEqual([{ nativePlace: "Talod", industryOther: "Solar panels", instagram: "kiran.solar", industries: 0 }]);
});
