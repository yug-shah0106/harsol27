import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "./db";
import { getBoss } from "./jobs";
import { env } from "./env";
import { createPaymentUpload, submitLead } from "./leads";
import { createLeadLogin, resetMemberPassword } from "./member-logins";
import { registerWorkers } from "./workers";

const run = crypto.randomUUID().slice(0, 8);
const email = `worker.${run}@example.test`;
let industryId: string;

beforeAll(async () => {
  const industry = await db().industry.create({ data: { name: `Worker ${run}`, nameKey: `worker ${run}`, slug: `worker-${run}`, sortOrder: 9500 } });
  industryId = industry.id;
});

afterAll(async () => {
  vi.unstubAllGlobals();
  await (await getBoss()).stop({ graceful: false });
  await db().$disconnect();
});

describe("email pipeline: form → queue → worker → Resend", () => {
  it("delivers the confirmation and the team alert for a submitted lead", async () => {
    // Email stubbed: nothing leaves the test. Other requests (the screenshot upload to local storage) go through.
    const sent: { to: unknown; subject: string; key: string | null }[] = [];
    const texts = new Map<string, string>(); // by idempotency key
    const realFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (!String(url).startsWith("https://api.resend.com")) return realFetch(url, init);
        const body = JSON.parse(String(init.body)) as { to: unknown; subject: string; text: string };
        const key = new Headers(init.headers).get("idempotency-key");
        sent.push({ to: body.to, subject: body.subject, key });
        if (key) texts.set(key, body.text);
        return new Response('{"id":"x"}', { status: 200 });
      }),
    );

    const boss = await getBoss();
    await registerWorkers(boss, {
      email: { apiKey: "re_test", from: "Harsol27 <test@example.test>" },
      teamAlertEmails: ["team@example.test"],
      appUrl: "https://harsol27.test",
      authSecret: env().BETTER_AUTH_SECRET,
    });

    // The payment screenshot, uploaded the way the browser does it.
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const ticket = await createPaymentUpload({ fileName: "paid.png", contentType: "image/png", sizeBytes: png.length }, new Headers({ "x-forwarded-for": "198.51.100.9" }));
    expect((await fetch(ticket.uploadUrl, { method: "PUT", body: png, headers: { "Content-Type": "image/png" } })).ok).toBe(true);

    const form = new FormData();
    for (const [k, v] of Object.entries({ firstName: "Worker", fatherName: "Father", lastName: "Test", nativePlace: "Harsol", address: "1 Relief Road", city: "Ahmedabad", state: "Gujarat", pincode: "380001", phone: "9876543210", email, businessCategory: "RETAIL", industryIds: industryId, paymentProof: ticket.key })) form.set(k, v);
    await submitLead(form, new Headers({ "x-forwarded-for": "198.51.100.9" }));
    const lead = await db().lead.findFirstOrThrow({ where: { email } });

    await expect.poll(() => sent.filter((s) => s.key?.endsWith(lead.id)).length, { timeout: 15_000 }).toBe(2);
    const mine = sent.filter((s) => s.key?.endsWith(lead.id));
    expect(mine).toContainEqual({ to: email, subject: "We have received your details · Harsol27", key: `lead-confirmation/${lead.id}` });
    expect(mine).toContainEqual({ to: ["team@example.test"], subject: `New lead: Worker Father Test (Worker ${run})`, key: `lead-team-alert/${lead.id}` });

    // Approved, the team makes the login: username and password go straight to the registration's email (2026-10-29).
    const admin = await db().user.create({ data: { name: "Worker Admin", email: `worker-admin.${run}@example.test`, role: "ADMIN" } });
    const actor = { id: admin.id, name: admin.name, email: admin.email, role: "ADMIN" as const };
    await db().lead.update({ where: { id: lead.id }, data: { decision: "APPROVED" } });
    const login = await createLeadLogin({ leadId: lead.id, username: `worker.${run}` }, actor);
    const reset = await resetMemberPassword({ leadId: lead.id }, actor); // and a new password, later
    const loginEmails = () => sent.filter((s) => s.key?.startsWith("member-login:") && s.to === email);
    await expect.poll(() => loginEmails().length, { timeout: 15_000 }).toBe(2);
    const [made, renewed] = ["Your Harsol27 seller login", "Your new Harsol27 password"].map((subject) => loginEmails().find((s) => s.subject === subject)!);
    expect(texts.get(made!.key!)).toContain(`Username: worker.${run}`);
    expect(texts.get(renewed!.key!)).toContain(`Password: ${reset.password}`); // whichever email is read, the newest password
    expect(texts.get(made!.key!)).toContain("Sign in: https://harsol27.test/seller/sign-in");
    expect(made!.key).not.toContain(login.password!);
  }, 30_000);
});

describe("worker process", () => {
  // The worker runs outside Next.js (see src/worker.ts). A module that imports Next.js runtime code
  // (e.g. errors.ts → next/navigation) crashes it at start; tests run under plain Node would not notice.
  it("loads its code the way the worker does", () => {
    const result = spawnSync(
      process.execPath,
      ["--conditions=react-server", "--import", "tsx", "--input-type=module", "-e", "await import('./src/server/workers.ts')"],
      { encoding: "utf8", timeout: 30_000 },
    );
    expect(result.stderr).not.toMatch(/Error/);
    expect(result.status).toBe(0);
  }, 35_000);
});
