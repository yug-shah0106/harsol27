import { expect, test } from "@playwright/test";
import { newPage, watchCsp } from "./helpers";

// Scroll and pointer animation (components/motion.tsx): GSAP, ScrollTrigger and Lenis.

test("below the fold waits for you, shows itself when reached or focused, and breaks no CSP rule", async ({ browser }) => {
  const page = await newPage(browser);
  const csp = watchCsp(page);
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.classList.contains("lenis")); // GSAP and Lenis are running

  // The call to action is below the fold: hidden until reached.
  const cta = page.locator("[data-reveal]", { has: page.getByRole("link", { name: "Get started" }) });
  await expect(cta).toHaveCSS("opacity", "0");
  await expect(page.getByRole("heading", { name: "Sell everything on Harsol27" })).toBeAttached(); // still readable to screen readers

  // A keyboard user tabbing ahead never lands on something invisible.
  await page.getByRole("link", { name: "Get started" }).last().focus();
  await expect(cta).toHaveCSS("opacity", "1");

  // Scrolling to the end reaches the rest: every revealed item, heading word and statement word ends
  // fully visible, and every giant line has slid fully into place.
  await page.mouse.move(640, 400);
  for (let i = 0; i < 30; i++) await page.mouse.wheel(0, 600);
  await expect
    .poll(() =>
      page.evaluate(() => [
        [...document.querySelectorAll("[data-reveal], [data-word]")].filter((el) => getComputedStyle(el).opacity !== "1").length,
        [...document.querySelectorAll("[data-slide]")].filter((el) => new DOMMatrix(getComputedStyle(el).transform).m41 !== 0).length,
      ]),
    )
    .toEqual([0, 0]);
  expect(csp).toEqual([]);
});

test("the marquee drifts on its own", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.classList.contains("lenis"));
  const track = page.locator("[data-marquee]");
  await track.scrollIntoViewIfNeeded();
  const x = () => track.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
  const start = await x();
  await expect.poll(x).not.toBe(start); // (it wraps round, so it can jump either way)
});

test("the header button leans toward a nearby mouse, and comes back", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.classList.contains("lenis"));
  const button = page.locator("header [data-magnet]");
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20);
  await expect.poll(() => button.evaluate((el) => el.style.transform)).toMatch(/translate\((?!0px, 0px)/);
  await page.mouse.move(10, 600);
  await expect.poll(() => button.evaluate((el) => el.style.transform)).toBe("translate(0px, 0px)");
});

test("reduced motion: nothing is hidden or moved, and scrolling stays native", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await page.waitForLoadState("networkidle"); // GSAP has loaded by now, and decided to do nothing
  expect(await page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(false);
  const moved = await page.evaluate(() =>
    [...document.querySelectorAll("[data-reveal], [data-word], [data-draw], [data-parallax], [data-slide], [data-marquee]")].filter(
      (el) => getComputedStyle(el).opacity !== "1" || (el as HTMLElement).style.transform,
    ).length,
  );
  expect(moved).toBe(0);
  await context.close();
});
