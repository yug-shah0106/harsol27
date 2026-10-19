"use client";

import { cn } from "cn";
import { startTransition, useActionState, useOptimistic } from "react";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/dropdown";
import { LEAD_DECISION_LABELS, LEAD_DECISIONS, type LeadDecisionValue } from "@/lib/lead-status";
import { decideLeadAction } from "./actions";

// Like the status pills: grey while pending, green once approved, red once rejected.
const PILL: Record<LeadDecisionValue, string> = {
  PENDING: "bg-secondary text-secondary-foreground",
  APPROVED: "bg-success/10 text-success dark:bg-success/20",
  REJECTED: "bg-destructive/10 text-destructive dark:bg-destructive/20",
};

/**
 * A lead's approval as a pill. Admins click it to choose Pending, Approved or Rejected, saved at once (it shows the
 * choice straight away, and goes back if the change is refused); viewers see the pill only. Its label
 * names the lead, for screen readers in the list.
 */
export function LeadDecision({ lead, canDecide }: { lead: { id: string; fullName: string; decision: LeadDecisionValue }; canDecide: boolean }) {
  const [state, action, pending] = useActionState(decideLeadAction, null);
  const [shown, show] = useOptimistic(lead.decision);

  if (!canDecide) return <Badge className={PILL[lead.decision]}>{LEAD_DECISION_LABELS[lead.decision]}</Badge>;

  const id = `decision-${lead.id}`;
  return (
    <div className="flex flex-col items-start gap-1">
      <label htmlFor={id} className="sr-only">
        Approval for {lead.fullName}
      </label>
      <Dropdown
        id={id}
        value={shown}
        disabled={pending}
        triggerClassName={cn("h-7 w-auto rounded-full border-0 py-0 pr-8 pl-3 text-xs font-semibold whitespace-nowrap md:text-xs", PILL[shown])}
        onValueChange={(value) =>
          startTransition(() => {
            show(value as LeadDecisionValue);
            const form = new FormData();
            form.set("leadId", lead.id);
            form.set("decision", value);
            action(form);
          })
        }
        options={LEAD_DECISIONS.map((d) => ({ value: d, label: LEAD_DECISION_LABELS[d] }))}
      />
      {state && !state.ok && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </div>
  );
}
