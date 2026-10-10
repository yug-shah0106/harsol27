import { expect, test } from "@playwright/test";
import { expectAccessible, unique } from "./helpers";
import { signInAs, STAFF, uniqueIp } from "./staff";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

test("admin adds, renames and deactivates an industry, and the lead form follows", async ({ page, browser }) => {
  const name = `E2E Industry ${unique()}`;
  const renamed = `${name} Renamed`;
  await signInAs(page, STAFF.admin);
  await page.goto("/admin/industries");
  await expectAccessible(page);

  await page.getByLabel("Add an industry").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Industry added.");
  const row = page.getByRole("listitem").filter({ hasText: name });
  await expect(row.getByText("Active")).toBeVisible();

  // Duplicate names are refused, case-insensitively, with a readable message.
  await page.getByLabel("Add an industry").fill(name.toUpperCase());
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "already exists" })).toBeVisible();

  await row.getByLabel(`New name for ${name}`).fill(renamed);
  await row.getByRole("button", { name: `Rename ${name}` }).click();
  const renamedRow = page.getByRole("listitem").filter({ hasText: renamed });
  await expect(renamedRow).toBeVisible();

  const visitor = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } })).newPage();
  await visitor.goto("/get-started");
  const industryOptions = async () => {
    await visitor.getByRole("combobox", { name: "Industry", exact: true }).click();
    const count = await visitor.getByRole("listbox").getByRole("option", { name: renamed, exact: true }).count();
    await visitor.keyboard.press("Escape");
    return count;
  };
  await expect.poll(industryOptions).toBe(1);

  await renamedRow.getByRole("button", { name: `Deactivate ${renamed}` }).click();
  await expect(renamedRow.getByText("Inactive")).toBeVisible();
  await visitor.reload();
  await expect.poll(industryOptions).toBe(0);
  await visitor.close();
});

test("a viewer sees industries but no controls", async ({ page }) => {
  await signInAs(page, STAFF.viewer);
  await page.goto("/admin/industries");
  await expect(page.getByText("Food Products")).toBeVisible();
  await expect(page.getByText("You have view-only access.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Deactivate|Rename|Add/ })).toHaveCount(0);
});
