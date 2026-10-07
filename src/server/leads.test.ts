import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HONEYPOT_FIELD } from "@/lib/lead-schema";
import { db } from "./db";
import { UserFacingError } from "./errors";
import { getBoss, QUEUES } from "./jobs";
import { changeLeadStatus, LEAD_IP_RULE, listLeads, leadListParamsSchema, submitLead } from "./leads";
import type { StaffUser } from "./staff-policy";

const run = crypto.randomUUID().slice(0, 8);
let industryId: string;
let inactiveIndustryId: string;
let admin: StaffUser;

const headersFor = (ip: string) => new Headers({ "x-forwarded-for": ip, "user-agent": "vitest" });
const uniqueIp = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

function form(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  const values = {
    fullName: "Asha Patel",
    phone: "98765 43210",
    email: `Asha.${run}@Example.com`,
    businessCategory: "MANUFACTURING",
    industryId,
    ...overrides,
  };
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

async function expectFieldError(promise: Promise<unknown>, field: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(UserFacingError);
  expect((error as UserFacingError).fields?.[field]).toBeTruthy();
}

beforeAll(async () => {
  const active = await db().industry.create({ data: { name: `Test ${run}`, nameKey: `test ${run}`, slug: `test-${run}`, sortOrder: 9000 } });
  const inactive = await db().industry.create({
    data: { name: `Old ${run}`, nameKey: `old ${run}`, slug: `old-${run}`, sortOrder: 9001, isActive: false },
  });
  industryId = active.id;
  inactiveIndustryId = inactive.id;
  const user = await db().user.create({ data: { name: "Lead Admin", email: `lead-admin-${run}@example.test`, role: "ADMIN" } });
  admin = { id: user.id, name: user.name, email: user.email, role: "ADMIN" };
});

afterAll(async () => {
  await (await getBoss()).stop({ graceful: false });
  await db().$disconnect();
});

describe("submitLead", () => {
  it("saves a normalised lead and queues both emails in the same transaction", async () => {
    const email = `asha.${run}@example.com`;
    await submitLead(form(), headersFor("203.0.113.7"));
    const lead = await db().lead.findFirstOrThrow({ where: { email } });
    expect(lead).toMatchObject({ phone: "+919876543210", status: "NEW", sourceIp: "203.0.113.7", userAgent: "vitest" });

    const jobs = await db().$queryRaw<{ name: string }[]>`
      SELECT name FROM pgboss.job WHERE data->>'leadId' = ${lead.id} ORDER BY name`;
    expect(jobs.map((j) => j.name)).toEqual([QUEUES.leadConfirmation, QUEUES.leadTeamAlert].sort());
  });

  it("returns normally but saves nothing when the honeypot is filled", async () => {
    const email = `bot.${run}@example.com`;
    await expect(submitLead(form({ email, [HONEYPOT_FIELD]: "http://spam.example" }), headersFor(uniqueIp()))).resolves.toBeUndefined();
    expect(await db().lead.count({ where: { email } })).toBe(0);
  });

  it("re-validates every field on the server", async () => {
    await expectFieldError(submitLead(form({ email: "nope" }), headersFor(uniqueIp())), "email");
    await expectFieldError(submitLead(form({ phone: "12345" }), headersFor(uniqueIp())), "phone");
    await expectFieldError(submitLead(form({ businessCategory: "FARMING" }), headersFor(uniqueIp())), "businessCategory");
  });

  it("rejects an industry that is inactive or does not exist", async () => {
    await expectFieldError(submitLead(form({ industryId: inactiveIndustryId }), headersFor(uniqueIp())), "industryId");
    await expectFieldError(submitLead(form({ industryId: crypto.randomUUID() }), headersFor(uniqueIp())), "industryId");
  });

  it("rate-limits submissions per IP", async () => {
    const ip = uniqueIp();
    for (let i = 0; i < LEAD_IP_RULE.max; i++) await submitLead(form({ email: `rl${i}.${run}@example.com` }), headersFor(ip));
    await expect(submitLead(form({ email: `rl-over.${run}@example.com` }), headersFor(ip))).rejects.toThrow(/Too many submissions/);
  });
});

describe("changeLeadStatus", () => {
  it("updates the status and records who changed it, from what and to what", async () => {
    const lead = await db().lead.findFirstOrThrow({ where: { email: `asha.${run}@example.com` } });
    await changeLeadStatus({ leadId: lead.id, status: "CONTACTED", note: "Called, interested" }, admin);
    await changeLeadStatus({ leadId: lead.id, status: "CONVERTED" }, admin);

    const history = await db().leadStatusChange.findMany({ where: { leadId: lead.id }, orderBy: { createdAt: "asc" } });
    expect(history.map((h) => [h.fromStatus, h.toStatus, h.actorId, h.note])).toEqual([
      ["NEW", "CONTACTED", admin.id, "Called, interested"],
      ["CONTACTED", "CONVERTED", admin.id, null],
    ]);
    expect((await db().lead.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe("CONVERTED");
  });

  it("refuses a change to the current status, an unknown status or an unknown lead", async () => {
    const lead = await db().lead.findFirstOrThrow({ where: { email: `asha.${run}@example.com` } });
    await expect(changeLeadStatus({ leadId: lead.id, status: "CONVERTED" }, admin)).rejects.toThrow(/already has this status/);
    await expectFieldError(changeLeadStatus({ leadId: lead.id, status: "WON" }, admin), "status");
    await expect(changeLeadStatus({ leadId: crypto.randomUUID(), status: "CLOSED" }, admin)).rejects.toThrow(/no longer exists/);
  });

  it("applies a duplicate change only once, even when both requests arrive together", async () => {
    const email = `race.${run}@example.com`;
    await submitLead(form({ email }), headersFor(uniqueIp()));
    const lead = await db().lead.findFirstOrThrow({ where: { email } });
    const results = await Promise.allSettled([
      changeLeadStatus({ leadId: lead.id, status: "CONTACTED" }, admin),
      changeLeadStatus({ leadId: lead.id, status: "CONTACTED" }, admin),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db().leadStatusChange.count({ where: { leadId: lead.id } })).toBe(1);
  });
});

describe("listLeads", () => {
  it("filters, searches and paginates", async () => {
    const params = leadListParamsSchema.parse({ industry: industryId, q: `rl1.${run}` });
    const { total, items } = await listLeads(params);
    expect(total).toBe(1);
    expect(items[0]?.email).toBe(`rl1.${run}@example.com`);

    const byStatus = await listLeads(leadListParamsSchema.parse({ industry: industryId, status: "CONVERTED" }));
    expect(byStatus.items.every((l) => l.status === "CONVERTED")).toBe(true);
  });

  it("ignores malformed URL parameters instead of failing", () => {
    expect(leadListParamsSchema.parse({ status: "HACKED", page: "-4", sort: ["oldest", "x"], industry: "1 OR 1=1" })).toEqual({
      status: undefined,
      industry: undefined,
      category: undefined,
      q: undefined,
      sort: "oldest",
      page: 1,
    });
  });
});
