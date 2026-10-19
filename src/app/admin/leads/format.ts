import { BUSINESS_CATEGORIES } from "@/lib/lead-schema";
import type { LeadDecisionValue } from "@/lib/lead-status";
import { formatDay, registrationSubscription } from "@/lib/subscription";

/** All staff-facing times are shown in India time, whatever the server's time zone. */
export function formatIst(date: Date): string {
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

export function categoryLabel(value: string): string {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/**
 * A registration's subscription as staff see it: its length and dates (from the day they registered);
 * "once approved" while pending; none when rejected, or for registrations from before the fee.
 */
export function subscriptionText(lead: { createdAt: Date; tenureMonths: number | null; decision: LeadDecisionValue }): string {
  if (!lead.tenureMonths) return "None (registered before the fee)";
  if (lead.decision === "REJECTED") return "None (rejected)";
  const { from, until, months } = registrationSubscription(lead.createdAt, lead.tenureMonths);
  return `${months} months: ${formatDay(from)} to ${formatDay(until)}${lead.decision === "PENDING" ? ", once approved" : ""}`;
}

/** The leads list's short form: when an approved registration's subscription ends. */
export function subscriptionEnds(lead: { createdAt: Date; tenureMonths: number | null; decision: LeadDecisionValue }): string | null {
  return lead.decision === "APPROVED" && lead.tenureMonths ? formatDay(registrationSubscription(lead.createdAt, lead.tenureMonths).until) : null;
}
