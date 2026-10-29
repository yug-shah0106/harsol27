export type SellerStatusValue = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export const SELLER_STATUS_LABELS: Record<SellerStatusValue, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Not approved",
  SUSPENDED: "Suspended",
};

/**
 * Products can be added once the company verification is sent: the team approves the company and its products
 * together (2026-10-29), and buyers see them only once the seller is approved. Suspended sellers cannot change them.
 */
export const mayListProducts = (status: SellerStatusValue) => status !== "SUSPENDED";

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
