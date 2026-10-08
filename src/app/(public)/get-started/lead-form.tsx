"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { BUSINESS_CATEGORIES, fieldErrors, HONEYPOT_FIELD, leadSchema } from "@/lib/lead-schema";
import { submitLeadAction } from "./actions";

type Industry = { id: string; name: string };

const FIELD_ORDER = ["fullName", "phone", "email", "businessCategory", "industryId"];

export function LeadForm({ industries }: { industries: Industry[] }) {
  const [state, formAction, pending] = useActionState(submitLeadAction, null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const serverErrors = state && !state.ok ? (state.fields ?? {}) : {};
  const errors = { ...serverErrors, ...clientErrors };

  // Move focus to the first invalid field after a server-side rejection, so keyboard and
  // screen-reader users land where the problem is.
  useEffect(() => {
    if (state && !state.ok) focusFirstError(formRef.current, state.fields ?? {});
    if (state?.ok) successRef.current?.focus();
  }, [state]);

  if (state?.ok) {
    return (
      <div ref={successRef} tabIndex={-1} className="outline-none">
        <FormAlert kind="success">
          <p className="text-base">Thank you! We have received your details.</p>
          <p className="mt-1 font-normal text-foreground">
            Our team will contact you soon. A confirmation is on its way to your email address.
          </p>
        </FormAlert>
      </div>
    );
  }

  // Same rules as the server, checked before sending so mistakes show instantly. The action is
  // dispatched by hand because React resets a form after its `action` runs, which would wipe the
  // visitor's input whenever the server rejects a field. Without JavaScript the form posts normally.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = leadSchema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      const found = fieldErrors(result.error);
      setClientErrors(found);
      focusFirstError(event.currentTarget, found);
      return;
    }
    setClientErrors({});
    startTransition(() => formAction(formData));
  }

  const describe = (name: string) => (errors[name] ? `${name}-error` : undefined);
  const clear = (name: string) => () =>
    setClientErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== name)));

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {state && !state.ok && <FormAlert kind="error">{state.error}</FormAlert>}

      <FieldGroup>
        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor="fullName">Full name</FieldLabel>
          <Input id="fullName" name="fullName" autoComplete="name" required maxLength={100} aria-invalid={!!errors.fullName} aria-describedby={describe("fullName")} onChange={clear("fullName")} />
          <FieldMessage id="fullName-error" message={errors.fullName} />
        </Field>

        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="phone">Phone number</FieldLabel>
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={32} placeholder="98765 43210" aria-invalid={!!errors.phone} aria-describedby={["phone-hint", describe("phone")].filter(Boolean).join(" ")} onChange={clear("phone")} />
          <p id="phone-hint" className="text-sm text-muted-foreground">
            Indian numbers need no country code. For other countries, start with + and the code.
          </p>
          <FieldMessage id="phone-error" message={errors.phone} />
        </Field>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} aria-invalid={!!errors.email} aria-describedby={describe("email")} onChange={clear("email")} />
          <FieldMessage id="email-error" message={errors.email} />
        </Field>

        <Field data-invalid={!!errors.businessCategory}>
          <FieldLabel htmlFor="businessCategory">Business category</FieldLabel>
          <NativeSelect id="businessCategory" name="businessCategory" required defaultValue="" className="w-full" aria-invalid={!!errors.businessCategory} aria-describedby={describe("businessCategory")} onChange={clear("businessCategory")}>
            <NativeSelectOption value="" disabled>
              Choose a category
            </NativeSelectOption>
            {BUSINESS_CATEGORIES.map((c) => (
              <NativeSelectOption key={c.value} value={c.value}>
                {c.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldMessage id="businessCategory-error" message={errors.businessCategory} />
        </Field>

        <Field data-invalid={!!errors.industryId}>
          <FieldLabel htmlFor="industryId">Industry</FieldLabel>
          <NativeSelect id="industryId" name="industryId" required defaultValue="" className="w-full" aria-invalid={!!errors.industryId} aria-describedby={describe("industryId")} onChange={clear("industryId")}>
            <NativeSelectOption value="" disabled>
              Choose an industry
            </NativeSelectOption>
            {industries.map((i) => (
              <NativeSelectOption key={i.id} value={i.id}>
                {i.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldMessage id="industryId-error" message={errors.industryId} />
        </Field>
      </FieldGroup>

      {/* Honeypot: invisible to people and screen readers; bots that fill it are silently ignored. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Leave this field empty</label>
        <input id={HONEYPOT_FIELD} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <p className="text-sm text-muted-foreground">All fields are required.</p>

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-fit">
        {pending ? "Sending…" : "Submit"}
      </Button>
    </form>
  );
}

function focusFirstError(form: HTMLFormElement | null, errors: Record<string, string>) {
  const name = FIELD_ORDER.find((f) => errors[f]);
  if (name) form?.querySelector<HTMLElement>(`#${name}`)?.focus();
}
