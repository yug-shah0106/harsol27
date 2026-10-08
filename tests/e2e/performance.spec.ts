import { expect, test, type Browser } from "@playwright/test";
import { newPage, unique } from "./helpers";
import { completeSignIn, makeApprovedSeller, makeProduct, randomMobile, sellerOf } from "./member";

// Core Web Vitals for the public pages, under Lighthouse's mobile conditions (4× slower CPU, slow 4G).
// Targets: Largest Contentful Paint under 2.5 s, Cumulative Layout Shift under 0.1 ("good").
// The home page has its own check, with the 3D size budget, in home-3d.spec.ts.

async function vitals(browser: Browser, path: string): Promise<{ lcp: number; cls: number }> {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await page.goto(path, { waitUntil: "load" });
  await page.waitForTimeout(1000); // let late layout shifts happen
  const result = await page.evaluate(
    () =>
      new Promise<{ lcp: number; cls: number }>((resolve) => {
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!entry.hadRecentInput) cls += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((list) => resolve({ lcp: list.getEntries().at(-1)!.startTime, cls })).observe({ type: "largest-contentful-paint", buffered: true });
      }),
  );
  await context.close();
  return result;
}

test("public pages are fast and stable on a mid-range phone over slow 4G", async ({ browser }) => {
  test.setTimeout(120_000);
  const sellerPage = await newPage(browser);
  const mobile = randomMobile();
  await sellerPage.goto("/sign-in");
  await completeSignIn(sellerPage, mobile);
  await makeApprovedSeller(mobile.e164, `Vitals Foods ${unique()}`);
  const seller = await sellerOf(mobile.e164);
  const product = await makeProduct(seller.id, `Vitals Khakhra ${unique()}`);

  for (const path of ["/search?q=khakhra", "/industries", "/industries/food-products", `/products/${product.slug}`, `/sellers/${seller.slug}`, "/get-started"]) {
    const { lcp, cls } = await vitals(browser, path);
    test.info().annotations.push({ type: path, description: `LCP ${Math.round(lcp)} ms · CLS ${cls.toFixed(3)}` });
    expect(lcp, `${path} LCP`).toBeLessThan(2500);
    expect(cls, `${path} CLS`).toBeLessThan(0.1);
  }
});
