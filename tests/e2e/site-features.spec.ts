import { expect, test } from "@playwright/test";
import { expectAccessible, newPage } from "./helpers";

// Site-wide pieces: cookie notice, dark mode, sticky header with reading progress, phone menu, back to top,
// "Talk to us", FAQ, password visibility, last-updated dates and the print stylesheet.

test("the cookie notice shows until OK is pressed, then stays away", async ({ browser }) => {
  // A first visit, past the language popup.
  const lang = { name: "lang", value: "en", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" as const };
  const context = await browser.newContext({ storageState: { cookies: [lang], origins: [] } });
  const page = await context.newPage();
  await page.goto("/about");
  const notice = page.getByRole("region", { name: "Cookies" });
  await expect(notice).toContainText("We only use essential cookies");
  await expectAccessible(page);
  await notice.getByRole("button", { name: "OK" }).click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "About Harsol27" })).toBeVisible();
  await expect(notice).toHaveCount(0);
  await context.close();
});

test("dark mode: the toggle switches at once, is remembered, and every page stays readable", async ({ browser }) => {
  test.setTimeout(120_000); // an accessibility check on five pages
  const page = await newPage(browser);
  await page.goto("/");
  const toggle = page.getByRole("banner").getByRole("button", { name: "Dark mode" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(27, 19, 15)"); // Marigold by lamplight

  for (const path of ["/", "/about", "/sign-in", "/search?q=khakhra", "/industries"]) {
    await page.goto(path); // rendered dark by the server: no flash of light
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expectAccessible(page);
    await page.emulateMedia({ reducedMotion: null });
  }
  await page.getByRole("banner").getByRole("button", { name: "Dark mode" }).click();
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
});

test("the header stays at the top, with a line showing how far down the page you are", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/");
  const progress = page.locator(".scroll-progress");
  const scale = () => progress.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
  expect(await scale()).toBeLessThan(0.05);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(scale).toBeGreaterThan(0.95);
  expect((await page.getByRole("banner").boundingBox())!.y).toBe(0);
});

test("coming soon: the header is clear at the top and frosts as you scroll; a reload starts at the top", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/coming-soon");
  const header = page.getByRole("banner");
  const background = () => header.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await background()).toMatch(/\/ 0\)$|rgba\(0, 0, 0, 0\)/);
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect.poll(background).toMatch(/\/ 0\.85\)$/);
  await page.reload();
  await page.waitForFunction(() => document.documentElement.classList.contains("lenis")); // settled: the browser would have restored by now
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("back to top appears once you have scrolled down, stays above the footer, and takes you (and the focus) back up", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/");
  const backToTop = page.getByRole("button", { name: "Back to top" });
  await expect(backToTop).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 2000));
  await expect(backToTop).toBeInViewport(); // rides the bottom of the screen
  // At the very end of the page it stops above the footer, not over it.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(async () => {
    const [button, footer] = await Promise.all([backToTop.boundingBox(), page.getByRole("contentinfo").boundingBox()]);
    return button!.y + button!.height <= footer!.y;
  }).toBe(true);
  await backToTop.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
  await expect(page.locator("#main")).toBeFocused();
});

test("phones get a menu button for the header links", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
  const button = page.getByRole("button", { name: "Menu" });
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const menu = page.getByRole("navigation", { name: "Menu" });
  await expect(menu.getByRole("link", { name: "About" })).toBeVisible();
  await expectAccessible(page);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await button.click();
  await menu.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(menu).toHaveCount(0);
  await context.close();
});

test("'Talk to us' opens a WhatsApp chat with the team, and the footer's Contact us page has WhatsApp and email", async ({ browser }) => {
  const page = await newPage(browser);
  for (const path of ["/industries", "/Seller-Registration"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "Talk to us on WhatsApp" })).toHaveAttribute("href", "https://wa.me/919152000352");
  }
  await page.getByRole("contentinfo").getByRole("link", { name: "Contact us" }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("heading", { level: 1, name: "Contact us" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Chat on WhatsApp" })).toHaveAttribute("href", "https://wa.me/919152000352");
  await expect(page.getByRole("main").getByRole("link", { name: "Write an email" })).toHaveAttribute("href", "mailto:sh27jyt@gmail.com");
  await expect(page.getByRole("link", { name: "Talk to us on WhatsApp" })).toHaveCount(0); // the page has its own WhatsApp button
  await expect(page.getByRole("main").getByText("Bhayandar West, Mira Bhayandar")).toBeVisible(); // the trust's address
  await expect(page.getByRole("main").getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute("href", /google\.com\/maps\/search/);
});

test("FAQ answers open and close, and the legal pages say when they last changed", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/about#faq");
  const answer = page.getByText("There is no cart, no online payment and no ordering.", { exact: false }).last();
  await expect(answer).toBeHidden();
  await page.getByText("Can I order or pay on Harsol27?").click();
  await expect(answer).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByText(/^Last updated \d{1,2} \w+ 2026$/)).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByText(/^Last updated/)).toBeVisible();
});

test("a password can be shown and hidden again", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/sign-in");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("secret-words");
  const show = page.getByRole("button", { name: "Show password" });
  await show.click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(show).toHaveAttribute("aria-pressed", "true");
  await show.click();
  await expect(password).toHaveAttribute("type", "password");
});

test("printing gives just the content", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/");
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("contentinfo")).toBeHidden();
  await expect(page.getByRole("link", { name: "Talk to us" })).toBeHidden();
  await expect(page.locator("[data-reveal]").last()).toHaveCSS("opacity", "1"); // even what hadn't scrolled into view yet
});
