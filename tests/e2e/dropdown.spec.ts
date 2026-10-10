import { expect, test } from "@playwright/test";
import { expectAccessible, watchCsp } from "./helpers";

// Our dropdown (components/ui/dropdown.tsx) on the search page: State (36 options) and Industry.

test("the dropdown works with the keyboard like a native select, and submits with its form", async ({ page }) => {
  const csp = watchCsp(page);
  await page.goto("/search");
  const state = page.getByRole("combobox", { name: "State", exact: true });
  const list = page.getByRole("listbox", { name: "State" });
  const highlighted = async () => {
    const id = await state.getAttribute("aria-activedescendant");
    return id ? page.locator(`[id="${id}"]`).innerText() : null;
  };

  await expect(state).toHaveText("Anywhere");
  await expect(state).toHaveAttribute("aria-expanded", "false");
  await expect(list).toBeHidden();

  // Open with ↓: the current choice is highlighted; ↓ moves; End jumps to the last.
  await state.focus();
  await page.keyboard.press("ArrowDown");
  await expect(list).toBeVisible();
  expect(await highlighted()).toBe("Anywhere");
  await page.keyboard.press("ArrowDown");
  expect(await highlighted()).toBe("Andaman and Nicobar Islands");
  await page.keyboard.press("End");
  expect(await highlighted()).toBe("West Bengal");
  await expectAccessible(page); // the open list too: named, options, active descendant

  // Escape closes without changing anything.
  await page.keyboard.press("Escape");
  await expect(list).toBeHidden();
  await expect(state).toHaveText("Anywhere");
  await expect(state).toBeFocused();

  // Typing jumps: "gu" → Gujarat; the same letter again cycles (m → Madhya Pradesh → Maharashtra).
  await page.keyboard.type("gu");
  expect(await highlighted()).toBe("Gujarat");
  await page.keyboard.press("Enter");
  await expect(list).toBeHidden();
  await expect(state).toHaveText("Gujarat");
  await page.waitForTimeout(700); // let the type-ahead forget
  await page.keyboard.press("Space");
  await page.keyboard.press("m");
  expect(await highlighted()).toBe("Madhya Pradesh");
  await page.keyboard.press("m");
  expect(await highlighted()).toBe("Maharashtra");
  await page.keyboard.press("Escape");

  // The mouse: open, click an option; a click elsewhere closes without choosing.
  const industry = page.getByRole("combobox", { name: "Industry", exact: true });
  await industry.click();
  await page.getByRole("listbox", { name: "Industry" }).getByRole("option", { name: "Food Products" }).click();
  await expect(industry).toHaveText("Food Products");
  await industry.click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(page.getByRole("listbox", { name: "Industry" })).toBeHidden();
  await expect(industry).toHaveText("Food Products");

  // The choices go with the form.
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/industry=food-products/);
  await expect(page).toHaveURL(/state=Gujarat/);
  await expect(page.getByRole("combobox", { name: "State", exact: true })).toHaveText("Gujarat"); // kept after the search
  expect(csp).toEqual([]);
});

test("Tab chooses the highlighted option and moves on, like a native select", async ({ page }) => {
  await page.goto("/search");
  const state = page.getByRole("combobox", { name: "State", exact: true });
  await state.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Tab");
  await expect(state).toHaveText("Andaman and Nicobar Islands");
  await expect(state).not.toBeFocused();
  await expect(page.getByRole("listbox", { name: "State" })).toBeHidden();
});
