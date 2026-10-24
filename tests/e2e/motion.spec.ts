import { expect, test } from "@playwright/test";
import { newPage, watchCsp } from "./helpers";

// Scroll and pointer animation (components/motion.tsx): GSAP, ScrollTrigger and Lenis.

test("below the fold waits for you, shows itself when reached or focused, and breaks no CSP rule", async ({ browser }) => {
  const page = await newPage(browser);
  const csp = watchCsp(page);
  await page.goto("/industries");
  await page.waitForFunction(() => document.documentElement.classList.contains("lenis")); // GSAP and Lenis are running

  // The last industry is below the fold: hidden until reached, but still readable to screen readers.
  const tile = page.locator("[data-reveal]", { has: page.getByRole("link", { name: /Videography/ }) });
  await expect(tile).toHaveCSS("opacity", "0");

  // A keyboard user tabbing ahead never lands on something invisible.
  await page.getByRole("link", { name: /Videography/ }).focus();
  await expect(tile).toHaveCSS("opacity", "1");

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

test("nothing follows the mouse: buttons and cards stay put under the pointer", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/industries");
  await page.waitForFunction(() => document.documentElement.classList.contains("lenis"));
  const button = page.getByRole("banner").getByRole("link", { name: "Seller registration" });
  const card = page.getByRole("link", { name: /Food Products/ });
  for (const target of [button, card]) {
    const box = (await target.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 10);
    await page.mouse.move(box.x + 5, box.y + 5);
  }
  await page.waitForTimeout(600); // longer than any easing would take
  for (const target of [button, card]) {
    expect(await target.evaluate((el) => [el.style.transform, el.style.getPropertyValue("--spot-x")])).toEqual(["", ""]);
  }
});

test("home: the line between the steps grows bit by bit as you scroll", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.classList.contains("lenis"));
  const path = page.locator("[data-path]");
  const drawn = () => path.evaluate((el) => 1 - parseFloat(getComputedStyle(el).strokeDashoffset));
  expect(await drawn()).toBe(0);
  // Halfway through its range (its drawing at 55% of the screen height), about half of it is drawn.
  await path.evaluate((el) => window.scrollTo(0, (el as SVGPathElement).ownerSVGElement!.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.55));
  await expect.poll(drawn).toBeGreaterThan(0.3);
  expect(await drawn()).toBeLessThan(0.7);
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
