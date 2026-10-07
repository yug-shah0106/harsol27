import { expect, test } from "@playwright/test";

test("pages carry a nonce-based CSP that changes per request, plus security headers", async ({ request }) => {
  const first = await request.get("/staff/sign-in");
  const second = await request.get("/staff/sign-in");
  const csp = first.headers()["content-security-policy"] ?? "";

  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain("unsafe-inline");
  expect(second.headers()["content-security-policy"]).not.toBe(csp);

  const headers = first.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("the sign-in page works under the CSP with no console violations", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && /Content Security Policy/i.test(msg.text())) violations.push(msg.text());
  });
  await page.goto("/staff/sign-in");
  await page.getByLabel("Email").fill("x@example.test");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  expect(violations).toEqual([]);
});

test("health check reports ok without leaking details", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
  expect(res.headers()["cache-control"]).toContain("no-store");
});
