export const LEAD_STATUSES = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"] as const;
export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatusValue, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CONVERTED: "Converted",
  CLOSED: "Closed",
};

/** The team's decision on a Seller registration (prisma LeadDecision), separate from the contact status. */
export const LEAD_DECISIONS = ["PENDING", "APPROVED", "REJECTED"] as const;
export type LeadDecisionValue = (typeof LEAD_DECISIONS)[number];

export const LEAD_DECISION_LABELS: Record<LeadDecisionValue, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
