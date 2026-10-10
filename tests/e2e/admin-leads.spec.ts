import { expect, test, type Page } from "@playwright/test";
import { choose, expectAccessible, fillLeadForm, unique } from "./helpers";
import { signInAs, STAFF, uniqueIp } from "./staff";

async function submitLead(page: Page, name: string, email: string) {
  await page.goto("/get-started");
  await fillLeadForm(page, { name, phone: "98250 54321", email, category: "Trading", industry: "Ceramics & Tiles" });
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("status")).toContainText("We have received your details");
}

test("admin finds a new lead, sees staff-only details, and changes its status with history", async ({ browser }) => {
  const ip = uniqueIp();
  const name = `Lead Admin Journey ${unique()}`;
  const visitor = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } })).newPage();
  await submitLead(visitor, name, `journey.${unique()}@example.test`);
  await visitor.close();

  const page = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } })).newPage();
  await signInAs(page, STAFF.admin);
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Leads" }).click();

  await page.getByLabel("Search name, email or phone").fill(name);
  await choose(page, "Status", "New");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/status=NEW/);
  await expect(page.getByText("1 lead")).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText(ip)).toBeVisible(); // source IP is shown to staff
  await expect(page.getByText("Ceramics & Tiles")).toBeVisible();

  await choose(page, "New status", "Contacted");
  await page.getByLabel("Note (optional)").fill("Spoke on the phone");
  await page.getByRole("button", { name: "Save status" }).click();
  await expect(page.getByRole("status")).toContainText("Status updated.");

  const history = page.getByRole("region", { name: "Status history" });
  await expect(history.getByText("New → Contacted")).toBeVisible();
  await expect(history.getByText(`by ${STAFF.admin.name}`)).toBeVisible();
  await expect(history.getByText("Spoke on the phone")).toBeVisible();
  await expectAccessible(page);
});

test("a viewer can read leads but gets no controls to change them", async ({ browser }) => {
  const name = `Lead Viewer Journey ${unique()}`;
  const visitor = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } })).newPage();
  await submitLead(visitor, name, `viewer.${unique()}@example.test`);
  await visitor.close();

  const page = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } })).newPage();
  await signInAs(page, STAFF.viewer);
  await page.goto(`/admin/leads?q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name }).click();
  await expect(page.getByText("You have view-only access.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save status" })).toHaveCount(0);
});

test("lead pages are staff-only", async ({ page }) => {
  await page.goto("/admin/leads");
  await expect(page).toHaveURL(/\/staff\/sign-in$/);
});
