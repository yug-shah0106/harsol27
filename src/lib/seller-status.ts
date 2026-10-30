export type SellerStatusValue = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export const SELLER_STATUS_LABELS: Record<SellerStatusValue, string> = {
  DRAFT: "Draft (not sent yet)",
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Not approved",
  SUSPENDED: "Suspended",
};

/**
 * A seller fills in both their company details and their products, then sends them for approval together; the team
 * approves both with one decision (client, 2026-10-30). Buyers see products only once the seller is approved.
 * Suspended sellers cannot change their products.
 */
export const mayListProducts = (status: SellerStatusValue) => status !== "SUSPENDED";

/** Company details can be changed, and sent for approval, only before the team has them or after a rejection. */
export const mayEditApplication = (status: SellerStatusValue) => status === "DRAFT" || status === "REJECTED";

/** Every decision staff can take, from which status, to which, and whether a reason is required. */
export const SELLER_DECISIONS = {
  approve: { label: "Approve", from: ["PENDING"], to: "APPROVED", needsReason: false },
  reject: { label: "Reject", from: ["PENDING"], to: "REJECTED", needsReason: true },
  suspend: { label: "Suspend", from: ["APPROVED"], to: "SUSPENDED", needsReason: true },
  reinstate: { label: "Reinstate", from: ["SUSPENDED"], to: "APPROVED", needsReason: false },
} as const satisfies Record<string, { label: string; from: readonly SellerStatusValue[]; to: SellerStatusValue; needsReason: boolean }>;

export type SellerDecision = keyof typeof SELLER_DECISIONS;
export const SELLER_DECISION_NAMES = Object.keys(SELLER_DECISIONS) as [SellerDecision, ...SellerDecision[]];

/** The decisions available for a seller in this status. Anything else is refused by the server. */
export function decisionsFor(status: SellerStatusValue): SellerDecision[] {
  return SELLER_DECISION_NAMES.filter((d) => (SELLER_DECISIONS[d].from as readonly string[]).includes(status));
}
