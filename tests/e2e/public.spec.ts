import { expect, test } from "@playwright/test";
import { expectAccessible, fillLeadForm, watchCsp } from "./helpers";
import { uniqueIp } from "./staff";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

test("home page: real HTML hero, seeded industries, how it works, call to action", async ({ page }) => {
  const csp = watchCsp(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Find the right Gujarati supplier");
  await expect(page.getByRole("heading", { name: "Industries on Harsol27" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Food Products" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await page.getByRole("link", { name: "Get started" }).first().click();
  await expect(page).toHaveURL(/\/get-started$/);
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

for (const path of ["/", "/about", "/terms", "/privacy", "/get-started"]) {
  test(`${path} has no detectable WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);
    await expectAccessible(page);
  });
}

test("lead form: client-side errors are announced with text and focus the first problem", async ({ page }) => {
  await page.goto("/get-started");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByLabel("Full name")).toBeFocused();
  await expect(page.getByText("Enter your full name.")).toBeVisible();
  await expect(page.getByText("Choose an industry.")).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveAttribute("aria-invalid", "true");
  await expectAccessible(page); // error state must be accessible too

  await page.getByLabel("Phone number").fill("12345");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Enter a valid phone number")).toBeVisible();
});

test("lead form: a valid submission shows a confirmation", async ({ page }) => {
  const csp = watchCsp(page);
  await page.goto("/get-started");
  await fillLeadForm(page, {
    name: "Public Journey",
    phone: "98250 12345",
    email: `public.${Date.now()}@example.test`,
    category: "Manufacturing",
    industry: "Food Products",
  });
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("status")).toContainText("We have received your details");
  expect(csp).toEqual([]);
});
