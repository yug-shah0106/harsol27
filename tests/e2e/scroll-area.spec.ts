import { expect, test } from "@playwright/test";
import { expectAccessible, newPage, watchCsp } from "./helpers";
import { signInAs, STAFF } from "./staff";

// Our ScrollArea at phone width, where the admin menu and the tables are wider than the screen.

test("on a phone, menus and tables scroll sideways, keyboard focus brings hidden items into view, and nothing is inaccessible", async ({ browser }) => {
  const page = await newPage(browser);
  await page.setViewportSize({ width: 375, height: 812 });
  const csp = watchCsp(page);
  await signInAs(page, STAFF.admin);
  await page.goto("/admin/subscriptions?view=active");

  const menu = page.getByRole("navigation", { name: "Admin" }).locator('[data-slot="scroll-area"]');
  const overflow = () => menu.evaluate((el) => ({ scrollable: el.scrollWidth > el.clientWidth, left: el.scrollLeft }));
  expect(await overflow()).toEqual({ scrollable: true, left: 0 });

  const last = page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Industries" });
  await last.focus(); // as Tab does: the browser scrolls the area to show it
  await expect.poll(async () => (await overflow()).left).toBeGreaterThan(0);
  await expect(last).toBeInViewport();

  await expectAccessible(page); // includes "scrollable regions must be reachable by keyboard"
  expect(csp).toEqual([]);
});
