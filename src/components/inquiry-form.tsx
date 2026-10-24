"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { sendInquiryAction } from "@/app/(public)/inquiry-actions";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { useI18n } from "@/components/i18n";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fieldErrors } from "@/lib/lead-schema";
import { fill, translateError } from "@/lib/i18n";
import { inquirySchema } from "@/lib/product-schema";

export function InquiryForm({
  target,
  returnTo,
  defaultName,
  about,
}: {
  target: { productId: string } | { sellerId: string };
  returnTo: string;
  defaultName: string;
  about: string;
}) {
  const { t } = useI18n();
  const r = t.inquiry;
  const [state, formAction, pending] = useActionState(sendInquiryAction, null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  // The rules' messages are English; shown in the visitor's language.
  const errors = Object.fromEntries(
    Object.entries({ ...(state && !state.ok ? (state.fields ?? {}) : {}), ...clientErrors }).map(([name, message]) => [name, translateError(t, message)]),
  );

  useEffect(() => {
    if (state && !state.ok) formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [state]);

  // Same rules as the server; dispatched by hand so a rejected message is not wiped.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = inquirySchema.safeParse({ buyerName: formData.get("buyerName"), message: formData.get("message") });
    const found = result.success ? {} : fieldErrors(result.error);
    setClientErrors(found);
    if (Object.keys(found).length) {
      event.currentTarget.querySelector<HTMLElement>(`#${Object.keys(found)[0]}`)?.focus();
      return;
    }
    startTransition(() => formAction(formData));
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {state && !state.ok && <FormAlert kind="error">{translateError(t, state.error)}</FormAlert>}
      {"productId" in target ? (
        <input type="hidden" name="productId" value={target.productId} />
      ) : (
        <input type="hidden" name="sellerId" value={target.sellerId} />
      )}
      <input type="hidden" name="returnTo" value={returnTo} />
      <FieldGroup>
        <Field data-invalid={!!errors.buyerName}>
          <FieldLabel htmlFor="buyerName">{r.name}</FieldLabel>
          <Input id="buyerName" name="buyerName" defaultValue={defaultName} autoComplete="name" maxLength={100} aria-invalid={!!errors.buyerName} aria-describedby={errors.buyerName ? "buyerName-error" : undefined} />
          <FieldMessage id="buyerName-error" message={errors.buyerName} />
        </Field>
        <Field data-invalid={!!errors.message}>
          <FieldLabel htmlFor="message">{r.need}</FieldLabel>
          <Textarea
            id="message"
            name="message"
            rows={4}
            maxLength={2000}
            placeholder={fill(r.placeholder, { about })}
            aria-invalid={!!errors.message}
            aria-describedby={["message-hint", errors.message ? "message-error" : ""].filter(Boolean).join(" ")}
          />
          <p id="message-hint" className="text-sm text-muted-foreground">
            {r.hint}
          </p>
          <FieldMessage id="message-error" message={errors.message} />
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? r.sending : r.submit}
      </Button>
    </form>
  );
}
