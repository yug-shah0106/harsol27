import AxeBuilder from "@axe-core/playwright";
import { expect, type Browser, type Page } from "@playwright/test";
import { uniqueIp } from "./staff";

/** A suffix for test names that stays unique even when copies of a test run in parallel. */
export const unique = () => `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

/**
 * A fresh visitor with their own client IP (so per-IP rate limits never leak between tests). The IP
 * header is added only to requests to the app: sent to storage, it would fail the bucket's strict CORS
 * rule, which allows nothing but Content-Type. Real browsers never send this header.
 */
export async function newPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  const ip = uniqueIp();
  await context.route(/^http:\/\/localhost:3217\//, (route) => route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ip } }));
  return context.newPage();
}

/** Fails on any WCAG 2.1 A/AA violation axe can detect automatically on the current page. */
export async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}

/** Collects Content-Security-Policy violations reported in the browser console. */
export function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && /Content Security Policy/i.test(msg.text())) violations.push(msg.text());
  });
  return violations;
}

export async function fillLeadForm(page: Page, values: { name: string; phone: string; email: string; category: string; industry: string }) {
  await page.getByLabel("Full name").fill(values.name);
  await page.getByLabel("Phone number").fill(values.phone);
  await page.getByLabel("Email").fill(values.email);
  await page.getByLabel("Business category").selectOption({ label: values.category });
  await page.getByLabel("Industry").selectOption({ label: values.industry });
}
