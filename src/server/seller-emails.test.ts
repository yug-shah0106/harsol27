import { describe, expect, it } from "vitest";
import { sellerApplicationAlertEmail, sellerDecisionEmail, type SellerChangeForEmail } from "./seller-emails";

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
