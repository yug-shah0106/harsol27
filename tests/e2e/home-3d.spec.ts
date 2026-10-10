import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, watchCsp } from "./helpers";

// Size budget for the home page, in KB as transferred (compressed). The 3D scene has no model files
// (its kites are generated in code), so its whole cost is the 3D library, loaded only after the page.
// Motion (GSAP, ScrollTrigger, Lenis: about 52 KB) also loads only after the page, and never with reduced motion.
const BUDGET_KB = { pageScripts: 180, scene3d: 260, motion: 60 };

async function scriptKb(page: Page): Promise<number> {
  const bytes = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((e) => (e as PerformanceResourceTiming).initiatorType === "script" || e.name.endsWith(".js"))
      .reduce((sum, e) => sum + (e as PerformanceResourceTiming).encodedBodySize, 0),
  );
  return bytes / 1024;
}

test("home: the kite picture is in the page itself; the live 3D fades in after the page has loaded", async ({ page }) => {
  const csp = watchCsp(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const response = await page.goto("/");
  const html = await response!.text();
  expect(html).toContain('data-3d="poster"');
  expect((html.match(/<polygon /g) ?? []).length).toBeGreaterThanOrEqual(27); // 9 kites × 3 pieces, drawn on the server
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await expect(page.locator('[data-3d="live"] canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => document.documentElement.classList.contains("lenis")); // motion has loaded too
  expect(await scriptKb(page)).toBeLessThan(BUDGET_KB.pageScripts + BUDGET_KB.scene3d + BUDGET_KB.motion);
  await expectAccessible(page);
  expect(csp).toEqual([]);
  expect(errors).toEqual([]);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("home: keeps the static picture and never downloads the 3D or motion libraries", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2500); // well past the point where the 3D would have started loading
    await expect(page.locator('[data-3d="poster"] svg').first()).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
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
