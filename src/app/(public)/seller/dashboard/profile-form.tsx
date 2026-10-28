"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { useI18n } from "@/components/i18n";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { translateError } from "@/lib/i18n";
import { INDIAN_STATES } from "@/lib/seller-schema";
import { saveProfileAction } from "./actions";

type Values = { contactName: string; contactPhone: string; contactEmail: string; address: string; city: string; state: string; description: string };

export function ProfileForm({ values }: { values: Values }) {
  const { t } = useI18n();
  const s = t.sellerArea;
  const [state, formAction, pending] = useActionState(saveProfileAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  // The rules' messages are English; shown in the visitor's language.
  const errors: Record<string, string> = Object.fromEntries(
    Object.entries(state && !state.ok ? (state.fields ?? {}) : {}).map(([name, message]) => [name, translateError(t, message)]),
  );

  useEffect(() => {
    if (state && !state.ok) formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [state]);

  // Dispatched by hand so React does not reset the fields to what was there before.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const text = (name: Exclude<keyof Values, "state" | "description">, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} defaultValue={values[name]} required aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} {...props} />
      <FieldMessage id={`${name}-error`} message={errors[name]} />
    </Field>
  );

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {state && !state.ok && <FormAlert kind="error">{translateError(t, state.error)}</FormAlert>}
      {state?.ok && <FormAlert kind="success">{s.saved}</FormAlert>}
      <FieldGroup>
        {text("contactName", s.contactName, { maxLength: 100, autoComplete: "name" })}
        {text("contactPhone", s.contactPhone, { type: "tel", inputMode: "tel", maxLength: 32, autoComplete: "tel" })}
        {text("contactEmail", s.contactEmail, { type: "email", maxLength: 254, autoComplete: "email" })}
        {text("address", s.businessAddress, { maxLength: 300, autoComplete: "street-address" })}
        {text("city", s.city, { maxLength: 80, autoComplete: "address-level2" })}
        <Field data-invalid={!!errors.state}>
          <FieldLabel htmlFor="state">{s.state}</FieldLabel>
          <Dropdown
            id="state"
            name="state"
            defaultValue={values.state}
            className="w-full"
            aria-invalid={!!errors.state}
            aria-describedby={errors.state ? "state-error" : undefined}
            options={INDIAN_STATES.map((name) => ({ value: name, label: name }))}
          />
          <FieldMessage id="state-error" message={errors.state} />
        </Field>
        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="description">{s.about}</FieldLabel>
          <Textarea id="description" name="description" rows={4} maxLength={1000} defaultValue={values.description} aria-invalid={!!errors.description} aria-describedby={errors.description ? "description-error" : undefined} />
          <FieldMessage id="description-error" message={errors.description} />
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-fit">
        {pending ? s.saving : s.saveProfile}
      </Button>
    </form>
  );
}
