import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./db";
import { UserFacingError } from "./errors";
import { getBoss, QUEUES } from "./jobs";
import { changeLeadStatus, countPerIndiaDay, createPaymentUpload, decideLead, indiaDay, LEAD_IP_RULE, leadListParamsSchema, listLeads, listPaidLeads, submitLead, updateLeadSubscription } from "./leads";
import { createLeadLogin, generatePassword } from "./member-logins";
import { verifyPassword } from "./password";
import type { StaffUser } from "./staff-policy";

const run = crypto.randomUUID().slice(0, 8);
let industryId: string;
let inactiveIndustryId: string;
let admin: StaffUser;

const headersFor = (ip: string) => new Headers({ "x-forwarded-for": ip, "user-agent": "vitest" });
const uniqueIp = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

/** The browser's two steps: ask for an upload URL, then PUT the screenshot straight to storage. */
async function paymentUpload(bytes: Uint8Array = PNG, contentType = "image/png"): Promise<string> {
  const { key, uploadUrl } = await createPaymentUpload({ fileName: "paid.png", contentType, sizeBytes: bytes.length }, headersFor(uniqueIp()));
  const response = await fetch(uploadUrl, { method: "PUT", body: Buffer.from(bytes), headers: { "Content-Type": contentType } });
  expect(response.ok).toBe(true);
  return key;
}

/** A complete form, with a fresh payment screenshot unless one is given. */
async function form(overrides: Record<string, string | string[]> = {}) {
  const fd = new FormData();
  const values = {
    firstName: "Asha",
    fatherName: "Ramesh",
    lastName: "Patel",
    nativePlace: "Harsol",
    address: "12 Station Road",
    city: "Talod",
    state: "Gujarat",
    pincode: "383 215",
    phone: "98765 43210",
    email: `Asha.${run}@Example.com`,
    businessCategory: "MANUFACTURING",
    industryIds: [industryId],
    paymentProof: "paymentProof" in overrides ? "" : await paymentUpload(),
    ...overrides,
  };
  for (const [k, v] of Object.entries(values)) for (const one of [v].flat()) fd.append(k, one);
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
    await submitLead(await form(), headersFor("203.0.113.7"));
    const lead = await db().lead.findFirstOrThrow({ where: { email } });
    expect(lead).toMatchObject({ phone: "+919876543210", status: "NEW", sourceIp: "203.0.113.7", userAgent: "vitest" });
    // The name in its parts, and whole (as staff see it); the address in its parts.
    expect(lead).toMatchObject({ firstName: "Asha", fatherName: "Ramesh", lastName: "Patel", fullName: "Asha Ramesh Patel" });
    expect(lead).toMatchObject({ address: "12 Station Road", city: "Talod", state: "Gujarat", pincode: "383215" });
    expect(lead.tenureMonths).toBe(15); // the subscription the fee bought (lib/fee.ts), from today

    const jobs = await db().$queryRaw<{ name: string }[]>`
      SELECT name FROM pgboss.job WHERE data->>'leadId' = ${lead.id} ORDER BY name`;
    expect(jobs.map((j) => j.name)).toEqual([QUEUES.leadConfirmation, QUEUES.leadTeamAlert].sort());
  });

  it("saves a registration whatever extra fields the browser's autofill adds (the old honeypot dropped them)", async () => {
    const email = `autofill.${run}@example.com`;
    await submitLead(await form({ email, company_website: "Patel Traders" }), headersFor(uniqueIp()));
    expect(await db().lead.count({ where: { email } })).toBe(1);
  });

  it("re-validates every field on the server", async () => {
    await expectFieldError(submitLead(await form({ email: "nope" }), headersFor(uniqueIp())), "email");
    await expectFieldError(submitLead(await form({ phone: "12345" }), headersFor(uniqueIp())), "phone");
    await expectFieldError(submitLead(await form({ businessCategory: "FARMING" }), headersFor(uniqueIp())), "businessCategory");
  });

  it("saves 'Other' as the visitor's own words, with no listed industry", async () => {
    const email = `other.${run}@example.com`;
    await submitLead(await form({ email, industryIds: ["other"], industryOther: "  Solar panels " }), headersFor(uniqueIp()));
    const lead = await db().lead.findFirstOrThrow({ where: { email }, include: { industries: true } });
    expect(lead).toMatchObject({ industries: [], industryOther: "Solar panels" });
    await expectFieldError(submitLead(await form({ email: `other2.${run}@example.com`, industryIds: ["other"] }), headersFor(uniqueIp())), "industryOther");
  });

  it("saves the one chosen industry, plus the optional links, and refuses a second industry", async () => {
    const email = `one.${run}@example.com`;
    await submitLead(await form({ email, industryIds: [industryId], website: "shah.example", instagram: "@shah", mapsLink: "" }), headersFor(uniqueIp()));
    const lead = await db().lead.findFirstOrThrow({ where: { email }, include: { industries: { select: { id: true } } } });
    expect(lead.industries.map((i) => i.id)).toEqual([industryId]);
    expect(lead).toMatchObject({ website: "https://shah.example/", instagram: "shah", mapsLink: null, industryOther: null });

    // Its own second industry: CI's database holds only the one the tests create.
    const second = (await db().industry.create({ data: { name: `Second ${run}`, nameKey: `second ${run}`, slug: `second-${run}`, sortOrder: 999 } })).id;
    await expectFieldError(submitLead(await form({ email: `two.${run}@example.com`, industryIds: [industryId, second] }), headersFor(uniqueIp())), "industryIds");
  });

  it("needs a real, unused payment screenshot", async () => {
    const email = `pay.${run}@example.com`;
    await expectFieldError(submitLead(await form({ email, paymentProof: "" }), headersFor(uniqueIp())), "paymentProof");
    await expectFieldError(submitLead(await form({ email, paymentProof: `lead-payments/${crypto.randomUUID()}.png` }), headersFor(uniqueIp())), "paymentProof");
    const renamed = await paymentUpload(new TextEncoder().encode("MZ fake executable"), "image/png");
    await expectFieldError(submitLead(await form({ email, paymentProof: renamed }), headersFor(uniqueIp())), "paymentProof");

    const paid = await paymentUpload();
    await submitLead(await form({ email, paymentProof: paid }), headersFor(uniqueIp()));
    expect(await db().lead.findFirstOrThrow({ where: { email } })).toMatchObject({ paymentProofKey: paid, paymentProofName: "paid.png" });
    // One screenshot backs one lead only.
    await expectFieldError(submitLead(await form({ email: `pay2.${run}@example.com`, paymentProof: paid }), headersFor(uniqueIp())), "paymentProof");
  });

  it("rejects an industry that is inactive or does not exist", async () => {
    await expectFieldError(submitLead(await form({ industryIds: [inactiveIndustryId] }), headersFor(uniqueIp())), "industryIds");
    await expectFieldError(submitLead(await form({ industryIds: [industryId, crypto.randomUUID()] }), headersFor(uniqueIp())), "industryIds");
  });

  it("rate-limits submissions per IP", async () => {
    const ip = uniqueIp();
    for (let i = 0; i < LEAD_IP_RULE.max; i++) await submitLead(await form({ email: `rl${i}.${run}@example.com` }), headersFor(ip));
    await expect(submitLead(await form({ email: `rl-over.${run}@example.com` }), headersFor(ip))).rejects.toThrow(/Too many submissions/);
  });
});

describe("the overview's days", () => {
  it("counts registrations per India-time day, ending today", () => {
    const now = new Date("2026-10-19T10:00:00Z"); // 3:30 pm in India
    expect(indiaDay(new Date("2026-10-18T18:29:00Z"))).toBe("2026-10-18"); // 11:59 pm in India
    expect(indiaDay(new Date("2026-10-18T18:30:00Z"))).toBe("2026-10-19"); // midnight in India
    const dates = ["2026-10-18T18:30:00Z", "2026-10-19T09:00:00Z", "2026-10-18T10:00:00Z", "2026-10-01T10:00:00Z"].map((d) => new Date(d));
    expect(countPerIndiaDay(dates, now, 3)).toEqual([
      { day: "2026-10-17", count: 0 },
      { day: "2026-10-18", count: 1 },
      { day: "2026-10-19", count: 2 }, // the one older than three days is left out
    ]);
  });
});

describe("decideLead", () => {
  it("approves a lead, lets the decision be changed later (back to pending too), and records each change", async () => {
    const email = `decide.${run}@example.com`;
    await submitLead(await form({ email }), headersFor(uniqueIp()));
    const lead = await db().lead.findFirstOrThrow({ where: { email } });
    expect(lead.decision).toBe("PENDING");

    await decideLead({ leadId: lead.id, decision: "APPROVED" }, admin);
    await decideLead({ leadId: lead.id, decision: "PENDING" }, admin);
    await decideLead({ leadId: lead.id, decision: "REJECTED" }, admin);

    const history = await db().leadDecisionChange.findMany({ where: { leadId: lead.id }, orderBy: { createdAt: "asc" } });
    expect(history.map((h) => [h.fromDecision, h.toDecision, h.actorId])).toEqual([
      ["PENDING", "APPROVED", admin.id],
      ["APPROVED", "PENDING", admin.id],
      ["PENDING", "REJECTED", admin.id],
    ]);
    expect((await db().lead.findUniqueOrThrow({ where: { id: lead.id } })).decision).toBe("REJECTED");
    expect((await db().lead.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe("NEW"); // the contact status is separate

    await expect(decideLead({ leadId: lead.id, decision: "REJECTED" }, admin)).rejects.toThrow(/already rejected/);
    await expectFieldError(decideLead({ leadId: lead.id, decision: "MAYBE" }, admin), "decision");
    await expect(decideLead({ leadId: crypto.randomUUID(), decision: "APPROVED" }, admin)).rejects.toThrow(/no longer exists/);
  });

  it("decides the payment separately, then the registration is listed under Subscriptions with the dates an admin set", async () => {
    const email = `payment.${run}@example.com`;
    await submitLead(await form({ email }), headersFor(uniqueIp()));
    const lead = await db().lead.findFirstOrThrow({ where: { email } });
    expect(lead.payment).toBe("PENDING");
    expect((await listPaidLeads()).map((l) => l.id)).not.toContain(lead.id);

    await decideLead({ leadId: lead.id, decision: "APPROVED", subject: "PAYMENT" }, admin);
    const after = await db().lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect([after.payment, after.decision]).toEqual(["APPROVED", "PENDING"]); // the registration's approval is separate
    const change = await db().leadDecisionChange.findFirstOrThrow({ where: { leadId: lead.id } });
    expect([change.subject, change.fromDecision, change.toDecision]).toEqual(["PAYMENT", "PENDING", "APPROVED"]);
    await expect(decideLead({ leadId: lead.id, decision: "APPROVED", subject: "PAYMENT" }, admin)).rejects.toThrow(/payment is already approved/);

    await updateLeadSubscription({ leadId: lead.id, from: "2026-11-01", months: "12", until: "2027-10-31" }, admin);
    const paid = (await listPaidLeads()).find((l) => l.id === lead.id);
    expect(paid?.subscription).toEqual({ from: new Date("2026-11-01T00:00:00Z"), until: new Date("2027-10-31T00:00:00Z"), months: 12 });

    await expectFieldError(updateLeadSubscription({ leadId: lead.id, from: "2026-11-01", months: "12", until: "2026-10-01" }, admin), "until");
    await expectFieldError(updateLeadSubscription({ leadId: lead.id, from: "2026-11-01", months: "0", until: "2027-10-31" }, admin), "months");
  });
});

describe("member logins", () => {
  it("are made by an admin for an approved registration, once, with a unique username and a password shown only then", async () => {
    const email = `login.${run}@example.com`;
    await submitLead(await form({ email }), headersFor(uniqueIp()));
    const lead = await db().lead.findFirstOrThrow({ where: { email } });
    const username = `asha.${run}`;

    await expect(createLeadLogin({ leadId: lead.id, username }, admin)).rejects.toThrow(/once the registration is approved/);
    await decideLead({ leadId: lead.id, decision: "APPROVED" }, admin);
    await expectFieldError(createLeadLogin({ leadId: lead.id, username: "A b" }, admin), "username");

    const login = await createLeadLogin({ leadId: lead.id, username: username.toUpperCase() }, admin); // stored lowercase
    expect(login.username).toBe(username);
    expect(login.password).toMatch(/^[a-zA-Z2-9]{12}$/);
    const user = await db().user.findUniqueOrThrow({ where: { username }, include: { accounts: true } });
    expect(user).toMatchObject({ role: "MEMBER", email, name: "Asha Ramesh Patel", mobile: "+919876543210", disabledAt: null });
    expect(await verifyPassword({ hash: user.accounts[0]!.password!, password: login.password })).toBe(true); // only its hash is kept
    expect((await db().lead.findUniqueOrThrow({ where: { id: lead.id } })).userId).toBe(user.id);
    expect(await db().auditLog.count({ where: { action: "MEMBER_LOGIN_CREATED", entityId: lead.id } })).toBe(1);

    await expect(createLeadLogin({ leadId: lead.id, username: `other.${run}` }, admin)).rejects.toThrow(/already has a login/);

    // A second registration can't take the same username.
    const second = `login2.${run}@example.com`;
    await submitLead(await form({ email: second }), headersFor(uniqueIp()));
    const other = await db().lead.findFirstOrThrow({ where: { email: second } });
    await decideLead({ leadId: other.id, decision: "APPROVED" }, admin);
    await expectFieldError(createLeadLogin({ leadId: other.id, username }, admin), "username");
  });

  it("works only while the registration is approved: rejecting switches it off and signs it out, approving turns it back on", async () => {
    const email = `switch.${run}@example.com`;
    await submitLead(await form({ email }), headersFor(uniqueIp()));
    const lead = await db().lead.findFirstOrThrow({ where: { email } });
    await decideLead({ leadId: lead.id, decision: "APPROVED" }, admin);
    await createLeadLogin({ leadId: lead.id, username: `switch.${run}` }, admin);
    const { userId } = await db().lead.findUniqueOrThrow({ where: { id: lead.id }, select: { userId: true } });
    await db().session.create({ data: { userId: userId!, token: `t-${run}`, expiresAt: new Date(Date.now() + 3_600_000) } });

    await decideLead({ leadId: lead.id, decision: "REJECTED" }, admin);
    expect((await db().user.findUniqueOrThrow({ where: { id: userId! } })).disabledAt).not.toBeNull();
    expect(await db().session.count({ where: { userId: userId! } })).toBe(0);

    await decideLead({ leadId: lead.id, decision: "APPROVED" }, admin);
    expect((await db().user.findUniqueOrThrow({ where: { id: userId! } })).disabledAt).toBeNull();
  });

  it("generates passwords without look-alike characters", () => {
    for (let i = 0; i < 50; i++) expect(generatePassword()).toMatch(/^[a-hjkmnp-zA-HJ-NP-Z2-9]{12}$/);
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
    await submitLead(await form({ email }), headersFor(uniqueIp()));
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
