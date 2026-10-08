import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

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
