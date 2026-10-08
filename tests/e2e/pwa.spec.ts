import { expect, test } from "@playwright/test";
import { expectAccessible } from "./helpers";
import { signInAs, STAFF, uniqueIp } from "./staff";

// Service workers are blocked in the other tests (see playwright.config.ts); these need them.
test.use({ serviceWorkers: "allow" });

/** Width and height from a PNG's header. */
const pngSize = (bytes: Buffer) => `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;

test("the app can be installed: a valid manifest whose icons exist at their stated sizes", async ({ request, page }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: expect.stringContaining("Harsol27"), short_name: "Harsol27", start_url: "/", display: "standalone" });
  expect(manifest.icons.map((i: { purpose: string }) => i.purpose)).toEqual(["any", "any", "maskable"]);
  for (const icon of manifest.icons as { src: string; sizes: string; type: string }[]) {
    const response = await request.get(icon.src);
    expect(response.headers()["content-type"]).toBe(icon.type);
    expect(pngSize(await response.body())).toBe(icon.sizes);
  }

  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});

test("offline: a page that cannot load shows the offline page, and nothing personal is ever saved", async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: "allow", extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } });
  const page = await context.newPage();
  await page.goto("/");
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15_000 });

  // Signed-in staff pages, then a check of everything the service worker has stored.
  await signInAs(page, STAFF.admin);
  await page.goto("/admin/leads");
  const saved = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) urls.push(new URL(request.url).pathname);
    return urls.sort();
  });
  expect(saved).toEqual(["/icons/icon-192.png", "/offline.css", "/offline.html"]);

  await context.setOffline(true);
  await page.goto("/search").catch(() => undefined);
  await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible();
  await expectAccessible(page);

  await context.setOffline(false);
  await page.getByRole("link", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Search products" })).toBeVisible();
  await context.close();
});

test("the footer offers to install the app when the browser allows it", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("button", { name: "Install the Harsol27 app" })).toHaveCount(0);

  // Chrome fires this when the site is installable; simulate it, with a prompt that records its use.
  await page.evaluate(() => {
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: async () => {
        (window as unknown as { prompted: boolean }).prompted = true;
      },
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "Install the Harsol27 app" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { prompted?: boolean }).prompted)).toBe(true);
  await expect(page.getByRole("button", { name: "Install the Harsol27 app" })).toHaveCount(0);
});
