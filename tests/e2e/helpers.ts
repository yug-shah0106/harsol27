import AxeBuilder from "@axe-core/playwright";
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { PNG_FILE } from "./member";
import { uniqueIp } from "./staff";

/** A suffix for test names that stays unique even when copies of a test run in parallel. */
export const unique = () => `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

/**
 * A fresh visitor with their own client IP (so per-IP rate limits never leak between tests). The IP
 * header is added only to requests to the app: sent to storage, it would fail the bucket's strict CORS
 * rule, which allows nothing but Content-Type. Real browsers never send this header.
 */
export async function newPage(browser: Browser, ip = uniqueIp()): Promise<Page> {
  const context = await browser.newContext();
  await sendClientIp(context, ip);
  return context.newPage();
}

/** Gives a context its own client IP, on requests to the app only (see newPage). */
export async function sendClientIp(context: BrowserContext, ip = uniqueIp()): Promise<void> {
  await context.route(/^http:\/\/localhost:3217\//, (route) => route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ip } }));
}

/** Fails on any WCAG 2.1 A/AA violation axe can detect automatically on the current page. */
export async function expectAccessible(page: Page) {
  // Check the page as it looks once settled: reduced motion undoes every scroll animation
  // (components/motion.tsx) and ends CSS entrances at once, so nothing is caught half-faded.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => [...document.querySelectorAll("[data-reveal], [data-word]")].every((el) => getComputedStyle(el).opacity === "1"));
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  // Names the elements, so a failure says where to look.
  expect(violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`)).toEqual([]);
}

/** Collects Content-Security-Policy violations reported in the browser console. */
export function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && /Content Security Policy/i.test(msg.text())) violations.push(msg.text());
  });
  return violations;
}

/** Picks an option in one of our dropdowns (components/ui/dropdown.tsx), as a person would: open it, click the option. */
export async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("listbox").getByRole("option", { name: option, exact: true }).click();
  await expect(page.getByRole("combobox", { name: label, exact: true })).toHaveText(option);
}

export async function fillLeadForm(page: Page, values: { name: string; phone: string; email: string; category: string; industry: string }) {
  await page.getByLabel("First name").fill(values.name);
  await page.getByLabel("Middle name").fill("Ramesh");
  await page.getByLabel("Last name").fill("Patel");
  await choose(page, "Native place", "Harsol");
  await fillAddress(page);
  await page.getByLabel("WhatsApp number").fill(values.phone);
  await page.getByLabel("Email").fill(values.email);
  await choose(page, "Category", values.category);
  await choose(page, "Industry", values.industry);
  await addPaymentScreenshot(page);
}

/** The lead form's address, in its parts. */
export async function fillAddress(page: Page, city = "Talod") {
  await page.getByLabel("Address", { exact: true }).fill("12 Station Road");
  await page.getByLabel("City").fill(city);
  await choose(page, "State", "Gujarat");
  await page.getByLabel("Pincode").fill("383 215");
}

/** Adds a tiny real PNG as the payment screenshot, and waits until it has reached storage. */
export async function addPaymentScreenshot(page: Page) {
  await page.getByLabel("Payment screenshot").setInputFiles(PNG_FILE("payment.png"));
  await expect(page.getByText("Uploaded: payment.png")).toBeVisible();
}
