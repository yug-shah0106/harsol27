import { describe, expect, it } from "vitest";
import { fieldErrors } from "./lead-schema";
import {
  daysUntil,
  dueReminder,
  EXPIRED_NOTICE,
  formatDay,
  formatRupees,
  paymentSchema,
  rupeesToPaise,
  subscriptionState,
  suggestPaidUntil,
} from "./subscription";

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
