import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "./db";
import { getBoss } from "./jobs";
import { createPaymentUpload, submitLead } from "./leads";
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
    const realFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (!String(url).startsWith("https://api.resend.com")) return realFetch(url, init);
        const body = JSON.parse(String(init.body)) as { to: unknown; subject: string };
        sent.push({ to: body.to, subject: body.subject, key: new Headers(init.headers).get("idempotency-key") });
        return new Response('{"id":"x"}', { status: 200 });
      }),
    );

    const boss = await getBoss();
    await registerWorkers(boss, {
      email: { apiKey: "re_test", from: "Harsol27 <test@example.test>" },
      teamAlertEmails: ["team@example.test"],
      appUrl: "https://harsol27.test",
    });

    // The payment screenshot, uploaded the way the browser does it.
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const ticket = await createPaymentUpload({ fileName: "paid.png", contentType: "image/png", sizeBytes: png.length }, new Headers({ "x-forwarded-for": "198.51.100.9" }));
    expect((await fetch(ticket.uploadUrl, { method: "PUT", body: png, headers: { "Content-Type": "image/png" } })).ok).toBe(true);

    const form = new FormData();
    for (const [k, v] of Object.entries({ fullName: "Worker Test", fatherName: "Father Test", nativePlace: "Harsol", address: "Ahmedabad", phone: "9876543210", email, businessCategory: "RETAIL", industryIds: industryId, paymentProof: ticket.key })) form.set(k, v);
    await submitLead(form, new Headers({ "x-forwarded-for": "198.51.100.9" }));
    const lead = await db().lead.findFirstOrThrow({ where: { email } });

    await expect.poll(() => sent.filter((s) => s.key?.endsWith(lead.id)).length, { timeout: 15_000 }).toBe(2);
    const mine = sent.filter((s) => s.key?.endsWith(lead.id));
    expect(mine).toContainEqual({ to: email, subject: "We have received your details · Harsol27", key: `lead-confirmation/${lead.id}` });
    expect(mine).toContainEqual({ to: ["team@example.test"], subject: `New lead: Worker Test (Worker ${run})`, key: `lead-team-alert/${lead.id}` });
  }, 20_000);
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
