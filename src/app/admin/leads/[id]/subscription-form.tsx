"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/action-form";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fromDateInput, subscriptionEnd, toDateInput } from "@/lib/subscription";
import { updateLeadSubscriptionAction } from "../actions";

type Values = { from: string; months: string; until: string };

/** Changing the start or the tenure fills in the end (the day before the same date, that many months later). */
function withEnd(next: Values): Values {
  const months = Number(next.months);
  if (!next.from || !Number.isInteger(months) || months < 1 || months > 120) return next;
  return { ...next, until: toDateInput(subscriptionEnd(fromDateInput(next.from), months)) };
}

/**
 * A registration's subscription, set by hand by an admin: start date, tenure in months and end date. The end
 * follows the start and the tenure, and can still be changed on its own.
 */
export function SubscriptionForm({ leadId, from, months, until }: { leadId: string; from: string; months: number | null; until: string }) {
  const [state, action] = useActionState(updateLeadSubscriptionAction, null);
  const [values, setValues] = useState<Values>({ from, months: months ? String(months) : "", until });
  const fields = state && !state.ok ? (state.fields ?? {}) : {};
  const field = (name: keyof Values) => ({
    id: `subscription-${name}`,
    name,
    required: true,
    value: values[name],
    "aria-invalid": !!fields[name],
    "aria-describedby": fields[name] ? `subscription-${name}-error` : undefined,
  });

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.ok && <FormAlert kind="success">{state.data}</FormAlert>}
      {state && !state.ok && !state.fields && <FormAlert kind="error">{state.error}</FormAlert>}
      <input type="hidden" name="leadId" value={leadId} />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="subscription-from">Start date</Label>
          <Input type="date" {...field("from")} onChange={(e) => setValues((v) => withEnd({ ...v, from: e.target.value }))} />
          <FieldMessage id="subscription-from-error" message={fields.from} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="subscription-months">Tenure (months)</Label>
          <Input type="number" inputMode="numeric" min={1} max={120} step={1} {...field("months")} onChange={(e) => setValues((v) => withEnd({ ...v, months: e.target.value }))} />
          <FieldMessage id="subscription-months-error" message={fields.months} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="subscription-until">End date</Label>
          <Input type="date" {...field("until")} onChange={(e) => setValues((v) => ({ ...v, until: e.target.value }))} />
          <FieldMessage id="subscription-until-error" message={fields.until} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Changing the start date or the tenure fills in the end date. You can still change the end date yourself.</p>
      <SubmitButton className="w-fit" pendingLabel="Saving…">
        Save subscription
      </SubmitButton>
    </form>
  );
}
