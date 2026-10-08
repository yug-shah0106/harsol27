import { describe, expect, it } from "vitest";
import { EXPIRED_NOTICE } from "@/lib/subscription";
import {
  sellerApplicationAlertEmail,
  sellerDecisionEmail,
  subscriptionReminderEmail,
  subscriptionSummaryEmail,
  type ReminderForEmail,
  type SellerChangeForEmail,
} from "./seller-emails";

const change = (fromStatus: string | null, toStatus: string, reason: string | null = null): SellerChangeForEmail => ({
  id: "chg-1",
  fromStatus,
  toStatus,
  reason,
  seller: { id: "s-1", companyName: "Patel <Khakhra>", contactName: "Asha", contactEmail: "asha@example.test", city: "Rajkot", state: "Gujarat" },
});

describe("seller emails", () => {
  it("alerts the team with a link to the review page, once per application", () => {
    const email = sellerApplicationAlertEmail(change(null, "PENDING"), ["team@example.test"], "https://h.test");
    expect(email.subject).toBe("New seller application: Patel <Khakhra>");
    expect(email.text).toContain("https://h.test/admin/sellers/s-1");
    expect(email.html).toContain("Patel &lt;Khakhra&gt;");
    expect(email.idempotencyKey).toBe("seller-application/chg-1");
    expect(sellerApplicationAlertEmail(change("REJECTED", "PENDING"), [], "x").subject).toMatch(/^Resubmitted/);
  });

  it.each([
    [null, "APPROVED", /approved/],
    ["SUSPENDED", "APPROVED", /active again/],
    ["PENDING", "REJECTED", /not approved/],
    ["APPROVED", "SUSPENDED", /suspended/],
  ])("tells the seller about %s → %s", (from, to, subject) => {
    const email = sellerDecisionEmail(change(from, to, "Reason here"), "https://h.test");
    expect(email?.subject).toMatch(subject);
    expect(email?.to).toBe("asha@example.test");
    expect(email?.idempotencyKey).toBe("seller-decision/chg-1");
  });

  it("includes the reason for rejections and suspensions", () => {
    expect(sellerDecisionEmail(change("PENDING", "REJECTED", "Blurry PAN card"), "x")?.text).toContain("Reason: Blurry PAN card");
  });

  it("sends nothing for a change that is not a decision", () => {
    expect(sellerDecisionEmail(change("REJECTED", "PENDING"), "x")).toBeNull();
  });
});

describe("subscription emails", () => {
  const today = new Date("2026-10-08T00:00:00Z");
  const reminder = (paidUntil: string, daysBefore: number): ReminderForEmail => ({
    id: "rem-1",
    paidUntil: new Date(`${paidUntil}T00:00:00Z`),
    daysBefore,
    seller: { companyName: "Patel <Khakhra>", contactName: "Asha", contactEmail: "asha@example.test" },
  });

  it.each([
    ["2026-11-07", 30, "Your Harsol27 subscription ends on 7 Nov 2026", "in 30 days"],
    ["2026-10-09", 1, "Your Harsol27 subscription ends tomorrow", "(tomorrow)"],
    ["2026-10-08", 1, "Your Harsol27 subscription ends today", "(today)"],
    ["2026-10-07", EXPIRED_NOTICE, "Your Harsol27 listings are now hidden", "no longer shown to buyers"],
  ])("paid until %s, reminder %i → %s", (paidUntil, daysBefore, subject, phrase) => {
    const email = subscriptionReminderEmail(reminder(paidUntil, daysBefore), ["team@example.test"], "https://h.test", today);
    expect(email.subject).toBe(subject);
    expect(email.text).toContain(phrase);
    expect(email.to).toBe("asha@example.test");
    expect(email.replyTo).toEqual(["team@example.test"]);
    expect(email.html).toContain("Patel &lt;Khakhra&gt;");
    expect(email.text).toContain("https://h.test/seller/subscription");
    expect(email.idempotencyKey).toBe("subscription-reminder/rem-1");
  });

  it("gives the team a weekly call list with phone numbers, once per day, and nothing when no one needs a call", () => {
    const seller = { id: "s-1", companyName: "Shah <Steel>", contactName: "Ravi", contactPhone: "+919825011111", city: "Rajkot", paidUntil: new Date("2026-10-20T00:00:00Z") };
    expect(subscriptionSummaryEmail({ today, expiring: [], expired: [] }, ["team@example.test"], "https://h.test")).toBeNull();
    const email = subscriptionSummaryEmail({ today, expiring: [seller], expired: [] }, ["team@example.test"], "https://h.test")!;
    expect(email.subject).toBe("Subscriptions: 1 expiring soon, 0 expired · 8 Oct 2026");
    expect(email.text).toContain("Shah <Steel> · Rajkot · Ravi · +919825011111 · 20 Oct 2026");
    expect(email.html).toContain("Shah &lt;Steel&gt;");
    expect(email.text).toContain("https://h.test/admin/subscriptions");
    expect(email.idempotencyKey).toBe("subscription-summary/2026-10-08");
  });
});
