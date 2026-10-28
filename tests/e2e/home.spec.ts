import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, watchCsp } from "./helpers";

// Size budget for the home page's scripts, in KB as transferred (compressed). Motion (GSAP, ScrollTrigger,
// Lenis: about 52 KB) loads only after the page, and never with reduced motion.
const BUDGET_KB = { pageScripts: 180, motion: 60 };

async function scriptKb(page: Page): Promise<number> {
  const bytes = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((e) => (e as PerformanceResourceTiming).initiatorType === "script" || e.name.endsWith(".js"))
      .reduce((sum, e) => sum + (e as PerformanceResourceTiming).encodedBodySize, 0),
  );
  return bytes / 1024;
}

test("home: the festival page with the search, every industry and the seller offer", async ({ page }) => {
  const csp = watchCsp(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Find the right supplier");
  await expect(page.getByRole("search")).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse by industry" })).toHaveAttribute("href", "/industries");
  await expect(page.getByRole("link", { name: "Food Products" })).toHaveAttribute("href", "/industries/food-products");
  await expect(page.getByRole("heading", { name: /months on Harsol27/ })).toBeVisible();
  await page.waitForFunction(() => document.documentElement.classList.contains("lenis")); // motion has loaded
  expect(await scriptKb(page)).toBeLessThan(BUDGET_KB.pageScripts + BUDGET_KB.motion);
  await expectAccessible(page);
  expect(csp).toEqual([]);
  expect(errors).toEqual([]);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("home: never downloads the motion libraries", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2500); // well past the point where motion would have started loading
    expect(await scriptKb(page)).toBeLessThan(BUDGET_KB.pageScripts);
  });
});

test("home: the main content appears within 2.5 s on a mid-range phone over slow 4G", async ({ browser }) => {
  // Lighthouse's mobile test conditions: 4× slower CPU, 150 ms latency, 1.6 Mbit/s down.
  const context = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });

  await page.goto("/", { waitUntil: "load" });
  const lcp = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        new PerformanceObserver((list) => resolve(list.getEntries().at(-1)!.startTime)).observe({ type: "largest-contentful-paint", buffered: true });
      }),
  );
  test.info().annotations.push({ type: "LCP", description: `${Math.round(lcp)} ms` });
  expect(lcp).toBeLessThan(2500);
  await context.close();
});
