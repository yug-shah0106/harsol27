import { describe, expect, it } from "vitest";
import { fieldErrors } from "./lead-schema";
import { addMonths, daysUntil, dueReminder, EXPIRED_NOTICE, formatDay, formatRupees, leadSubscription, paymentSchema, registrationSubscription, rupeesToPaise, subscriptionState, suggestPaidUntil } from "./subscription";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("dueReminder", () => {
  it.each([
    [45, null],
    [31, null],
    [30, 30],
    [8, 30],
    [7, 7],
    [2, 7],
    [1, 1],
    [0, 1], // the last visible day
    [-1, EXPIRED_NOTICE], // hidden from today
    [-7, EXPIRED_NOTICE], // a worker outage of up to a week still sends it
    [-8, null], // never months later
  ])("with %i days left → %s", (daysLeft, expected) => {
    expect(dueReminder(daysLeft)).toBe(expected);
  });
});

describe("suggestPaidUntil", () => {
  const today = d("2026-10-08");

  it("adds a year to the current date when renewing early, so no paid days are lost", () => {
    expect(suggestPaidUntil(d("2026-11-30"), today)).toEqual(d("2027-11-30"));
    expect(suggestPaidUntil(today, today)).toEqual(d("2027-10-08")); // last day, still active
  });

  it("starts the year today after a lapse, or for a first payment", () => {
    expect(suggestPaidUntil(d("2026-09-01"), today)).toEqual(d("2027-10-07"));
    expect(suggestPaidUntil(null, today)).toEqual(d("2027-10-07"));
  });

  it("turns 29 February into 28 February", () => {
    expect(suggestPaidUntil(d("2028-02-29"), d("2028-01-01"))).toEqual(d("2029-02-28"));
    expect(suggestPaidUntil(null, d("2028-03-01"))).toEqual(d("2029-02-28")); // lapsed: from 29 Feb 2028
  });
});

describe("subscriptionState and daysUntil", () => {
  const today = d("2026-10-08");
  it("classifies by whole days", () => {
    expect(daysUntil(d("2026-10-09"), today)).toBe(1);
    expect(subscriptionState(null, today)).toEqual({ kind: "none" });
    expect(subscriptionState(d("2026-11-07"), today)).toEqual({ kind: "expiring", daysLeft: 30 });
    expect(subscriptionState(d("2026-11-08"), today)).toEqual({ kind: "active", daysLeft: 31 });
    expect(subscriptionState(today, today)).toEqual({ kind: "expiring", daysLeft: 0 });
    expect(subscriptionState(d("2026-10-05"), today)).toEqual({ kind: "expired", daysAgo: 3 });
  });
});

describe("money and dates", () => {
  it("converts rupees to paise exactly", () => {
    expect(rupeesToPaise("2000")).toBe(200_000);
    expect(rupeesToPaise("2,000.5")).toBe(200_050);
    expect(rupeesToPaise("19.99")).toBe(1999);
    expect(rupeesToPaise("")).toBeNull();
  });

  it("formats for India", () => {
    expect(formatRupees(250_000_00)).toBe("₹2,50,000");
    expect(formatRupees(200_050)).toBe("₹2,000.50");
    expect(formatDay(d("2027-10-07"))).toBe("7 Oct 2027");
  });
});

describe("paymentSchema", () => {
  const valid = { paidUntil: "2027-10-07", amount: "", paidOn: "", reference: "", note: "" };

  it("accepts a date with everything else optional", () => {
    expect(paymentSchema.safeParse(valid).success).toBe(true);
    expect(paymentSchema.safeParse({ ...valid, amount: "2,000.50", paidOn: "2026-10-08", reference: "UPI 1234" }).success).toBe(true);
  });

  it("explains each problem on its own field", () => {
    const result = paymentSchema.safeParse({ ...valid, paidUntil: "", amount: "2000.505", paidOn: "07/10/2026" });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!)).toEqual({
      paidUntil: "Enter the new paid-until date.",
      amount: "Enter the amount in rupees, for example 2000 or 2000.50.",
      paidOn: "Enter a valid payment date.",
    });
    expect(paymentSchema.safeParse({ ...valid, paidUntil: "1999-01-01" }).success).toBe(false);
  });
});

describe("a Seller registration's subscription", () => {
  const day = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

  it("runs from the India-time day they registered, through the day before the same date months later", () => {
    expect(registrationSubscription(new Date("2026-10-19T07:00:00Z"), 15)).toEqual({ from: day("2026-10-19"), until: day("2028-01-18"), months: 15 });
    // 5:00 am in India on 19 Oct is still 18 Oct in UTC: it counts as the 19th.
    expect(registrationSubscription(new Date("2026-10-18T23:30:00Z"), 15).from).toEqual(day("2026-10-19"));
  });

  it("ends on a shorter month's last day", () => {
    expect(addMonths(day("2027-01-31"), 1)).toEqual(day("2027-02-28"));
    expect(addMonths(day("2027-11-30"), 3)).toEqual(day("2028-02-29")); // a leap year
    expect(registrationSubscription(new Date("2027-01-31T06:00:00Z"), 1).until).toEqual(day("2027-02-28"));
    expect(registrationSubscription(new Date("2027-03-01T06:00:00Z"), 1).until).toEqual(day("2027-03-31"));
  });

  it("uses the dates an admin set, else the registration day and tenure, else none (before the fee)", () => {
    const registered = { createdAt: new Date("2026-10-19T07:00:00Z"), tenureMonths: 15, subscriptionFrom: null, subscriptionUntil: null };
    expect(leadSubscription(registered)).toEqual({ from: day("2026-10-19"), until: day("2028-01-18"), months: 15 });
    expect(leadSubscription({ ...registered, tenureMonths: 12, subscriptionFrom: day("2026-11-01"), subscriptionUntil: day("2027-12-31") })).toEqual({ from: day("2026-11-01"), until: day("2027-12-31"), months: 12 });
    expect(leadSubscription({ ...registered, tenureMonths: null })).toBeNull();
  });
});
