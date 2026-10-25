import { expect, test } from "@playwright/test";
import { expectAccessible, newPage } from "./helpers";

// English, Hindi and Gujarati (client, 2026-10-24): the first-visit popup, the header's language button, and the
// visitor's choice carried to every public page, form errors included. The admin stays English.

test("first visit: the popup asks for a language, and the choice is remembered", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto("/coming-soon"); // served at "/" before launch (the tests run the full site)
  const popup = page.getByRole("dialog");
  await expect(popup).toContainText("Choose your language");
  await expect(popup).toContainText("તમારી ભાષા પસંદ કરો");
  await expectAccessible(page);
  await popup.getByRole("button", { name: "ગુજરાતી" }).click();
  await expect(popup).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ઉડાન ભરવા");
  await expect(page.locator("div.contents[lang]")).toHaveAttribute("lang", "gu-IN");
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("banner").getByRole("link", { name: "હોમ" })).toBeVisible();
  await context.close();
});

test("first visit: closing the popup keeps English and does not ask again", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto("/contact");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(async () => (await context.cookies()).find((c) => c.name === "lang")?.value).toBe("en");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Contact us" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await context.close();
});

test("the header's language button switches the page, and form errors follow it", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/Seller-Registration");
  await page.getByRole("banner").getByRole("combobox", { name: "Language" }).click();
  await page.getByRole("option", { name: "हिन्दी" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Harsol27 के साथ शुरू करें"); // the launched site's title
  await expect(page.getByLabel("पहला नाम")).toBeVisible();
  await page.getByRole("button", { name: "जमा करें" }).click();
  await expect(page.getByText("अपना पहला नाम लिखें।")).toBeVisible();
  await expectAccessible(page);

  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("उपयोग के नियम");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "गोपनीयता" })).toBeVisible();

  // Back to English from the same button (now named in Hindi).
  await page.getByRole("banner").getByRole("combobox", { name: "भाषा" }).click();
  await page.getByRole("option", { name: "English" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms of use");
});
