import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { daysFromToday, makeSeller, makeStaff } from "../../tests/factories";
import { EXPIRED_NOTICE, toDateInput } from "@/lib/subscription";
import { db } from "./db";
import { UserFacingError } from "./errors";
import { getBoss, QUEUES } from "./jobs";
import type { StaffUser } from "./staff-policy";
import { indiaToday } from "./visibility";
import { countSubscriptionViews, listSubscriptions, recordPayment } from "./subscriptions";
import { queueDueReminders, registerWorkers } from "./workers";

let admin: StaffUser;
beforeAll(async () => {
  admin = await makeStaff();
});
afterAll(async () => {
  vi.unstubAllGlobals();
  await (await getBoss()).stop({ graceful: false });
  await db().$disconnect();
});

const form = (sellerId: string, current: Date | null, fields: Partial<Record<string, string>>) => ({
  sellerId,
  expectedPaidUntil: current ? toDateInput(current) : "",
  paidUntil: "",
  amount: "",
  paidOn: "",
  reference: "",
  note: "",
  ...fields,
});

async function fieldsOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(UserFacingError);
  return (error as UserFacingError).fields;
}

describe("recordPayment", () => {
  it("sets the paid-until date and keeps who recorded what, atomically", async () => {
    const { seller } = await makeSeller({ paidUntil: null });
    const next = daysFromToday(364);
    await recordPayment(form(seller.id, null, { paidUntil: toDateInput(next), amount: "2,000.50", paidOn: toDateInput(daysFromToday(0)), reference: "UPI 4471" }), admin);

    expect((await db().seller.findUniqueOrThrow({ where: { id: seller.id } })).paidUntil).toEqual(next);
    const [change] = await db().subscriptionChange.findMany({ where: { sellerId: seller.id } });
    expect(change).toMatchObject({ previousPaidUntil: null, newPaidUntil: next, amountPaise: 200_050, reference: "UPI 4471", actorId: admin.id });
  });

  it("records a double-submitted form once: the second sees the date has moved", async () => {
    const current = daysFromToday(10);
    const { seller } = await makeSeller({ paidUntil: current });
    const input = form(seller.id, current, { paidUntil: toDateInput(daysFromToday(375)) });
    await recordPayment(input, admin);
    await expect(recordPayment(input, admin)).rejects.toThrow(/changed a moment ago/);
    expect(await db().subscriptionChange.count({ where: { sellerId: seller.id } })).toBe(1);
  });

  it("needs a note to move the date earlier, and refuses a payment date in the future", async () => {
    const current = daysFromToday(100);
    const { seller } = await makeSeller({ paidUntil: current });
    const earlier = { paidUntil: toDateInput(daysFromToday(50)) };
    expect(await fieldsOf(recordPayment(form(seller.id, current, earlier), admin))).toHaveProperty("note");
    expect(await fieldsOf(recordPayment(form(seller.id, current, { paidUntil: toDateInput(daysFromToday(400)), paidOn: toDateInput(daysFromToday(1)) }), admin))).toEqual({
      paidOn: "The payment date cannot be in the future.",
    });
    await recordPayment(form(seller.id, current, { ...earlier, note: "Typing mistake last time" }), admin);
    expect((await db().seller.findUniqueOrThrow({ where: { id: seller.id } })).paidUntil).toEqual(daysFromToday(50));
  });

  it("validates every field on the server too", async () => {
    const { seller } = await makeSeller();
    expect(await fieldsOf(recordPayment(form(seller.id, seller.paidUntil, { paidUntil: "soon", amount: "lots" }), admin))).toEqual({
      paidUntil: "Enter the new paid-until date.",
      amount: "Enter the amount in rupees, for example 2000 or 2000.50.",
    });
  });
});

describe("subscription list", () => {
  it("files approved sellers under expiring, expired, unpaid and active", async () => {
    const tag = `Listcheck ${crypto.randomUUID().slice(0, 6)}`;
    const make = async (paidUntil: Date | null, status: "APPROVED" | "SUSPENDED" = "APPROVED") => {
      const { seller } = await makeSeller({ paidUntil, status });
      await db().seller.update({ where: { id: seller.id }, data: { companyName: `${tag} ${seller.companyName}` } });
      return seller.id;
    };
    const expiring = await make(daysFromToday(5));
    const expired = await make(daysFromToday(-3));
    const unpaid = await make(null);
    const later = await make(daysFromToday(200));
    await make(daysFromToday(5), "SUSPENDED"); // not approved: in no view

    const ids = async (view: "expiring" | "expired" | "unpaid" | "active") => (await listSubscriptions({ view, q: tag, page: 1 })).items.map((s) => s.id).sort();
    expect(await ids("expiring")).toEqual([expiring]);
    expect(await ids("expired")).toEqual([expired]);
    expect(await ids("unpaid")).toEqual([unpaid]);
    expect(await ids("active")).toEqual([expiring, later].sort());
    expect((await countSubscriptionViews()).expiring).toBeGreaterThanOrEqual(1);
  });
});

describe("renewal reminders", () => {
  it("queues the one reminder due for each approved seller, once, and again only after a renewal", async () => {
    await queueDueReminders(); // settle sellers left by earlier tests
    const cases = [
      [45, null],
      [30, 30],
      [5, 7],
      [0, 1],
      [-1, EXPIRED_NOTICE],
      [-10, null],
    ] as const;
    const sellers = await Promise.all(cases.map(async ([days]) => (await makeSeller({ paidUntil: daysFromToday(days) })).seller));
    const suspended = (await makeSeller({ paidUntil: daysFromToday(7), status: "SUSPENDED" })).seller;

    expect(await queueDueReminders()).toBe(4);
    for (const [i, [, expected]] of cases.entries()) {
      const rows = await db().subscriptionReminder.findMany({ where: { sellerId: sellers[i]!.id } });
      expect(rows.map((r) => r.daysBefore)).toEqual(expected === null ? [] : [expected]);
    }
    expect(await db().subscriptionReminder.count({ where: { sellerId: suspended.id } })).toBe(0);
    const [jobs] = await db().$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pgboss.job j JOIN "SubscriptionReminder" r ON r.id::text = j.data->>'reminderId'
      WHERE j.name = ${QUEUES.subscriptionReminderEmail} AND r."sellerId" = ANY(${sellers.map((s) => s.id)}::uuid[])`;
    expect(jobs!.n).toBe(4);

    expect(await queueDueReminders()).toBe(0); // a retried or repeated run sends nothing new

    // Renewed to a date 7 days out: a new reminder for the new date.
    await db().seller.update({ where: { id: sellers[1]!.id }, data: { paidUntil: daysFromToday(7) } });
    expect(await queueDueReminders()).toBe(1);
  });

  it("emails the seller with replies to the team, marks it sent, skips a reminder made stale by a renewal, and sends the weekly summary", async () => {
    const sent: { to: unknown; replyTo: unknown; subject: string; key: string | null }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as { to: unknown; reply_to: unknown; subject: string };
        sent.push({ to: body.to, replyTo: body.reply_to, subject: body.subject, key: new Headers(init.headers).get("idempotency-key") });
        return new Response('{"id":"x"}', { status: 200 });
      }),
    );
    const { seller: due } = await makeSeller({ paidUntil: daysFromToday(1) });
    const { seller: renewed } = await makeSeller({ paidUntil: daysFromToday(1) });
    await queueDueReminders();
    await db().seller.update({ where: { id: renewed.id }, data: { paidUntil: daysFromToday(366) } }); // renewed before the email went out

    const boss = await getBoss();
    await registerWorkers(
      boss,
      { email: { apiKey: "re_test", from: "Harsol27 <test@example.test>" }, teamAlertEmails: ["team@example.test"], appUrl: "https://harsol27.test" },
      new Set([QUEUES.subscriptionReminderEmail, QUEUES.subscriptionSummary]),
    );

    const reminder = await db().subscriptionReminder.findFirstOrThrow({ where: { sellerId: due.id } });
    await expect.poll(async () => (await db().subscriptionReminder.findUniqueOrThrow({ where: { id: reminder.id } })).sentAt, { timeout: 15_000 }).not.toBeNull();
    expect(sent.find((s) => s.key === `subscription-reminder/${reminder.id}`)).toEqual({
      to: `${due.slug}@example.test`, // the factory's contact email (the field itself is never loaded)
      replyTo: ["team@example.test"],
      subject: "Your Harsol27 subscription ends tomorrow",
      key: `subscription-reminder/${reminder.id}`,
    });

    const stale = await db().subscriptionReminder.findFirstOrThrow({ where: { sellerId: renewed.id } });
    await expect.poll(async () => (await db().$queryRaw<{ state: string }[]>`
      SELECT state::text FROM pgboss.job WHERE name = ${QUEUES.subscriptionReminderEmail} AND data->>'reminderId' = ${stale.id}`)[0]?.state, { timeout: 15_000 }).toBe("completed");
    expect(sent.some((s) => s.to === `${renewed.slug}@example.test`)).toBe(false);
    expect((await db().subscriptionReminder.findUniqueOrThrow({ where: { id: stale.id } })).sentAt).toBeNull();

    // The weekly summary (normally sent by the Monday schedule) goes to the team.
    await boss.send(QUEUES.subscriptionSummary, {});
    await expect.poll(() => sent.find((s) => s.key === `subscription-summary/${toDateInput(indiaToday())}`)?.to, { timeout: 15_000 }).toEqual(["team@example.test"]);
  }, 45_000);
});
