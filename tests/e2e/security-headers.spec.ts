import { expect, test } from "@playwright/test";
import { newPage } from "./helpers";
import { completeSignIn, randomMobile, setLastBackup } from "./member";
import { signInAs, STAFF } from "./staff";

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

test("session cookies cannot be read by scripts or sent from other sites; staff sessions end with the browser", async ({ browser }) => {
  const sessionCookie = async (page: Awaited<ReturnType<typeof newPage>>) =>
    (await page.context().cookies()).find((c) => c.name.startsWith("harsol27") && c.name.endsWith("session_token"));

  const member = await newPage(browser);
  await member.goto("/sign-in");
  await completeSignIn(member, randomMobile());
  const memberCookie = await sessionCookie(member);
  expect(memberCookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
  expect(memberCookie!.expires).toBeGreaterThan(Date.now() / 1000 + 6 * 86_400); // 7-day buyer session

  const staff = await newPage(browser);
  await signInAs(staff, STAFF.viewer);
  const staffCookie = await sessionCookie(staff);
  expect(staffCookie).toMatchObject({ httpOnly: true, sameSite: "Lax", expires: -1 }); // browser-session only
  expect(await staff.evaluate(() => document.cookie)).not.toContain("session_token");
});

test("server actions refuse the same form posted from another site", async ({ request }) => {
  // The lead form's real action fields, as a browser without JavaScript would post them.
  const html = await (await request.get("/get-started")).text();
  const fields: Record<string, string> = { fullName: "Cross Site" };
  for (const [, name, value] of html.matchAll(/name="(\$ACTION[^"]*)"(?: value="([^"]*)")?/g)) fields[name!] = (value ?? "").replaceAll("&quot;", '"');
  expect(Object.keys(fields).some((k) => k.startsWith("$ACTION_1:"))).toBe(true);

  const post = (origin: string) => request.post("/get-started", { headers: { Origin: origin }, multipart: fields });
  expect((await post("http://localhost:3217")).status()).toBe(200); // the site itself: the action runs
  expect((await post("https://evil.example")).status()).toBe(500); // another site: refused before it runs
});

test("the full health check (for an uptime monitor) needs the worker and a recent backup, and reveals nothing else", async ({ request }) => {
  await setLastBackup(null);
  const degraded = await request.get("/api/health/full");
  expect(degraded.status()).toBe(503);
  expect(await degraded.json()).toEqual({ status: "degraded" });

  await setLastBackup(true); // the worker started by the test setup is already checking in
  await expect.poll(async () => (await request.get("/api/health/full")).status(), { timeout: 15_000 }).toBe(200);
  expect(await (await request.get("/api/health/full")).json()).toEqual({ status: "ok" });
  expect((await request.get("/api/health/full")).headers()["cache-control"]).toBe("no-store");
});

