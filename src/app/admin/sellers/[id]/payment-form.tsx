"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fieldErrors } from "@/lib/lead-schema";
import { paymentSchema } from "@/lib/subscription";
import { recordPaymentAction } from "../actions";

const FIELDS = ["paidUntil", "amount", "paidOn", "reference", "note"] as const;

/** Records an off-site payment and the new paid-until date. Dispatched by hand so a rejected form keeps its values. */
export function PaymentForm({ sellerId, currentPaidUntil, suggested }: { sellerId: string; currentPaidUntil: string; suggested: string }) {
  const [state, formAction, pending] = useActionState(recordPaymentAction, null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const errors = { ...(state && !state.ok ? (state.fields ?? {}) : {}), ...clientErrors };

  useEffect(() => {
    if (state && !state.ok) formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
    if (state?.ok) formRef.current?.reset(); // the page now shows the new date; clear the payment details
  }, [state]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = paymentSchema.safeParse(Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "")])));
    const found = result.success ? {} : fieldErrors(result.error);
    setClientErrors(found);
    if (Object.keys(found).length) {
      event.currentTarget.querySelector<HTMLElement>(`#${Object.keys(found)[0]}`)?.focus();
      return;
    }
    startTransition(() => formAction(formData));
  }

  const describedBy = (name: string, hint?: string) => [hint, errors[name] ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="sellerId" value={sellerId} />
      <input type="hidden" name="expectedPaidUntil" value={currentPaidUntil} />
      <FieldGroup>
        <Field data-invalid={!!errors.paidUntil}>
          <FieldLabel htmlFor="paidUntil">New paid-until date</FieldLabel>
          {/* key: after a save the suggestion moves on a year, and the field must show it. */}
          <Input key={suggested} id="paidUntil" name="paidUntil" type="date" required defaultValue={suggested} aria-invalid={!!errors.paidUntil} aria-describedby={describedBy("paidUntil", "paidUntil-hint")} className="w-full sm:w-56" />
          <p id="paidUntil-hint" className="text-sm text-muted-foreground">
            Suggested: one year after the current date (or from today if it has passed). Listings are shown up to and including this day.
          </p>
          <FieldMessage id="paidUntil-error" message={errors.paidUntil} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="amount">Amount paid, ₹ (optional)</FieldLabel>
            <Input id="amount" name="amount" inputMode="decimal" autoComplete="off" maxLength={14} aria-invalid={!!errors.amount} aria-describedby={describedBy("amount")} />
            <FieldMessage id="amount-error" message={errors.amount} />
          </Field>
          <Field data-invalid={!!errors.paidOn}>
            <FieldLabel htmlFor="paidOn">Paid on (optional)</FieldLabel>
            <Input id="paidOn" name="paidOn" type="date" aria-invalid={!!errors.paidOn} aria-describedby={describedBy("paidOn")} />
            <FieldMessage id="paidOn-error" message={errors.paidOn} />
          </Field>
        </div>
        <Field data-invalid={!!errors.reference}>
          <FieldLabel htmlFor="reference">Receipt or UPI reference (optional)</FieldLabel>
          <Input id="reference" name="reference" autoComplete="off" maxLength={100} aria-invalid={!!errors.reference} aria-describedby={describedBy("reference")} />
          <FieldMessage id="reference-error" message={errors.reference} />
        </Field>
        <Field data-invalid={!!errors.note}>
          <FieldLabel htmlFor="note">Internal note (optional; the seller does not see it)</FieldLabel>
          <Textarea id="note" name="note" rows={2} maxLength={1000} aria-invalid={!!errors.note} aria-describedby={describedBy("note")} />
          <FieldMessage id="note-error" message={errors.note} />
        </Field>
      </FieldGroup>
      {state && !state.ok && <FormAlert kind="error">{state.error}</FormAlert>}
      {state?.ok && <FormAlert kind="success">{state.data}</FormAlert>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Record payment"}
      </Button>
    </form>
  );
}
