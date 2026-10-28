"use client";

import { Plus, Trash2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { useI18n } from "@/components/i18n";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { Textarea } from "@/components/ui/textarea";
import { fill, translateError } from "@/lib/i18n";
import { MAX_SPECIFICATIONS } from "@/lib/product-schema";
import { createProductAction, updateProductAction } from "./actions";

type Values = { name: string; industryId: string; description: string; specifications: { label: string; value: string }[] };

export function ProductForm({ productId, values, industries }: { productId?: string; values: Values; industries: { id: string; name: string }[] }) {
  const { t } = useI18n();
  const s = t.sellerArea;
  const [state, formAction, pending] = useActionState(productId ? updateProductAction : createProductAction, null);
  const [rows, setRows] = useState(() =>
    (values.specifications.length ? values.specifications : [{ label: "", value: "" }]).map((r) => ({ ...r, rowId: crypto.randomUUID() })),
  );
  const formRef = useRef<HTMLFormElement>(null);
  // The rules' messages are English; shown in the visitor's language.
  const errors: Record<string, string> = Object.fromEntries(
    Object.entries(state && !state.ok ? (state.fields ?? {}) : {}).map(([name, message]) => [name, translateError(t, message)]),
  );

  useEffect(() => {
    if (state && !state.ok) formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [state]);

  // Dispatched by hand so React does not clear the form when the server rejects a field.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const update = (rowId: string, part: "label" | "value", text: string) =>
    setRows((current) => current.map((r) => (r.rowId === rowId ? { ...r, [part]: text } : r)));

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {state && !state.ok && <FormAlert kind="error">{translateError(t, state.error)}</FormAlert>}
      {state?.ok && <FormAlert kind="success">{s.saved}</FormAlert>}
      {productId && <input type="hidden" name="productId" value={productId} />}
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">{s.productName}</FieldLabel>
          <Input id="name" name="name" defaultValue={values.name} maxLength={120} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
          <FieldMessage id="name-error" message={errors.name} />
        </Field>
        <Field data-invalid={!!errors.industryId}>
          <FieldLabel htmlFor="industryId">{s.industry}</FieldLabel>
          <Dropdown
            id="industryId"
            name="industryId"
            defaultValue={values.industryId}
            placeholder={s.industryPlaceholder}
            className="w-full"
            aria-invalid={!!errors.industryId}
            aria-describedby={errors.industryId ? "industryId-error" : undefined}
            searchable={{ placeholder: s.industrySearch }}
            options={industries.map((i) => ({ value: i.id, label: i.name }))}
          />
          <FieldMessage id="industryId-error" message={errors.industryId} />
        </Field>
        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="description">{s.description}</FieldLabel>
          <Textarea id="description" name="description" rows={6} maxLength={5000} defaultValue={values.description} aria-invalid={!!errors.description} aria-describedby={["description-hint", errors.description ? "description-error" : ""].filter(Boolean).join(" ")} />
          <p id="description-hint" className="text-sm text-muted-foreground">
            {s.descriptionHint}
          </p>
          <FieldMessage id="description-error" message={errors.description} />
        </Field>
      </FieldGroup>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-semibold">{s.specs}</legend>
        <p className="-mt-1 text-sm text-muted-foreground">{s.specsHint}</p>
        {rows.map((row, i) => (
          <div key={row.rowId} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor={`spec_label_${i}`} className="sr-only">
                {fill(s.detailName, { n: i + 1 })}
              </label>
              <Input id={`spec_label_${i}`} name={`spec_label_${i}`} placeholder={s.detailPlaceholder} maxLength={60} value={row.label} onChange={(e) => update(row.rowId, "label", e.target.value)} aria-invalid={!!errors[`spec_label_${i}`]} />
              <FieldMessage id={`spec_label_${i}-error`} message={errors[`spec_label_${i}`]} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor={`spec_value_${i}`} className="sr-only">
                {fill(s.detailValue, { n: i + 1 })}
              </label>
              <Input id={`spec_value_${i}`} name={`spec_value_${i}`} placeholder={s.valuePlaceholder} maxLength={200} value={row.value} onChange={(e) => update(row.rowId, "value", e.target.value)} aria-invalid={!!errors[`spec_value_${i}`]} />
              <FieldMessage id={`spec_value_${i}-error`} message={errors[`spec_value_${i}`]} />
            </div>
            <Button type="button" variant="ghost" size="icon-lg" aria-label={fill(s.removeDetail, { n: i + 1 })} onClick={() => setRows((current) => current.filter((r) => r.rowId !== row.rowId))}>
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        {rows.length < MAX_SPECIFICATIONS && (
          <Button type="button" variant="outline" className="w-fit" onClick={() => setRows((current) => [...current, { label: "", value: "", rowId: crypto.randomUUID() }])}>
            <Plus aria-hidden="true" /> {s.addDetail}
          </Button>
        )}
      </fieldset>

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-fit">
        {pending ? s.saving : productId ? s.save : s.create}
      </Button>
    </form>
  );
}
