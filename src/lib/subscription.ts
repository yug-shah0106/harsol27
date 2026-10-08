import { z } from "zod";

// Subscription rules, shared by the admin form, the seller pages, the reminder job and the emails.
// Dates are whole days stored as UTC midnight (Postgres `date`), and "today" is the date in India
// (server/visibility.ts → indiaToday). One yearly plan; no prices are stored (client, 2026-10-08).

const DAY_MS = 86_400_000;

/** Reminder emails to the seller, in days before the paid-until date (client decision, 2026-10-08). */
export const REMINDER_DAYS = [30, 7, 1] as const;
/** Stored as `daysBefore` for the "your listings are now hidden" email, sent the day after paid-until. */
export const EXPIRED_NOTICE = -1;
/** If the worker was down, an expiry notice is still sent up to this many days late, never later. */
export const EXPIRED_NOTICE_LATEST_DAYS = 7;
/** The team's weekly summary and the admin list look this far ahead (and back, for expired). */
export const EXPIRING_SOON_DAYS = 30;

export const addDays = (day: Date, days: number) => new Date(day.getTime() + days * DAY_MS);

/** Whole days from `today` to `paidUntil`: 0 = the last visible day, negative = lapsed. */
export const daysUntil = (paidUntil: Date, today: Date) => Math.round((paidUntil.getTime() - today.getTime()) / DAY_MS);

/**
 * Which reminder belongs to today, given the days left. Exactly one reminder applies at a time, so a
 * missed run sends the current one late instead of piling up stale ones: with 5 days left only the
 * 7-day reminder is sent, even if the 30-day one never went out.
 */
export function dueReminder(daysLeft: number): number | null {
  if (daysLeft < 0) return daysLeft >= -EXPIRED_NOTICE_LATEST_DAYS ? EXPIRED_NOTICE : null;
  const ascending = [...REMINDER_DAYS].sort((a, b) => a - b); // 1, 7, 30
  return ascending.find((d) => daysLeft <= d) ?? null;
}

/** One year on, keeping the day of the month (29 Feb becomes 28 Feb). */
function addOneYear(day: Date): Date {
  const next = new Date(Date.UTC(day.getUTCFullYear() + 1, day.getUTCMonth(), day.getUTCDate()));
  return next.getUTCMonth() === day.getUTCMonth() ? next : new Date(Date.UTC(day.getUTCFullYear() + 1, day.getUTCMonth() + 1, 0));
}

/**
 * The date the admin form suggests for a renewal (staff can change it). Renewing early adds a year
 * to the current paid-until date, so no paid days are lost; after a lapse the year starts today.
 */
export function suggestPaidUntil(current: Date | null, today: Date): Date {
  return addOneYear(current && current >= today ? current : addDays(today, -1));
}

export type SubscriptionState =
  | { kind: "none" }
  | { kind: "active" | "expiring"; daysLeft: number }
  | { kind: "expired"; daysAgo: number };

export function subscriptionState(paidUntil: Date | null, today: Date): SubscriptionState {
  if (!paidUntil) return { kind: "none" };
  const daysLeft = daysUntil(paidUntil, today);
  if (daysLeft < 0) return { kind: "expired", daysAgo: -daysLeft };
  return { kind: daysLeft <= EXPIRING_SOON_DAYS ? "expiring" : "active", daysLeft };
}

/** "7 Oct 2027". */
export function formatDay(day: Date): string {
  return day.toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

/** For `<input type="date">` values: "2027-10-07". */
export const toDateInput = (day: Date) => day.toISOString().slice(0, 10);
export const fromDateInput = (value: string) => new Date(`${value}T00:00:00.000Z`);

export function formatRupees(paise: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: paise % 100 ? 2 : 0 }).format(paise / 100);
}

const RUPEES = /^\d{1,8}(\.\d{1,2})?$/; // up to ₹9,99,99,999.99

/** "2,000.5" → 200050 paise; "" → null. Exact: no floating point. */
export function rupeesToPaise(value: string): number | null {
  const clean = value.replaceAll(",", "").trim();
  if (!clean) return null;
  const [rupees = "0", fraction = ""] = clean.split(".");
  return Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
}

const day = (message: string) => z.iso.date({ error: message }).refine((v) => v >= "2020-01-01" && v <= "2100-12-31", message);

/** The admin's "record payment" form. Same rules in the browser and on the server. */
export const paymentSchema = z.object({
  paidUntil: day("Enter the new paid-until date."),
  amount: z
    .string()
    .trim()
    .refine((v) => v === "" || RUPEES.test(v.replaceAll(",", "")), "Enter the amount in rupees, for example 2000 or 2000.50."),
  paidOn: z.union([z.literal(""), day("Enter a valid payment date.")]),
  reference: z.string().trim().max(100, "Keep the reference to 100 characters or fewer."),
  note: z.string().trim().max(1000, "Keep the note to 1000 characters or fewer."),
});
