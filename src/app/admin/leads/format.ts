import { BUSINESS_CATEGORIES } from "@/lib/lead-schema";
import type { LeadDecisionValue } from "@/lib/lead-status";
import { formatDay, leadSubscription, type LeadSubscriptionFields } from "@/lib/subscription";

/** All staff-facing times are shown in India time, whatever the server's time zone. */
export function formatIst(date: Date): string {
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

export function categoryLabel(value: string): string {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

type SubscriptionLead = LeadSubscriptionFields & { decision: LeadDecisionValue; payment: LeadDecisionValue };

/**
 * A registration's subscription as staff see it: its length and dates; "once the payment is approved" until
 * an admin has checked the payment screenshot; none when the registration or the payment is rejected.
 */
export function subscriptionText(lead: SubscriptionLead): string {
  const subscription = leadSubscription(lead);
  if (!subscription) return "None (registered before the fee)";
  if (lead.decision === "REJECTED") return "None (rejected)";
  if (lead.payment === "REJECTED") return "None (payment rejected)";
  const text = `${subscription.months ? `${subscription.months} months: ` : ""}${formatDay(subscription.from)} to ${formatDay(subscription.until)}`;
  return lead.payment === "APPROVED" ? text : `${text}, once the payment is approved`;
}

/** The leads list's short form: when a paid registration's subscription ends. */
export function subscriptionEnds(lead: SubscriptionLead): string | null {
  const subscription = leadSubscription(lead);
  return lead.payment === "APPROVED" && lead.decision !== "REJECTED" && subscription ? formatDay(subscription.until) : null;
}
