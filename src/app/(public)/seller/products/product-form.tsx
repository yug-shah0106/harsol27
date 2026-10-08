"use client";

import { Plus, Trash2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_SPECIFICATIONS } from "@/lib/product-schema";
import { createProductAction, updateProductAction } from "./actions";

type Values = { name: string; industryId: string; description: string; specifications: { label: string; value: string }[] };

export function ProductForm({ productId, values, industries }: { productId?: string; values: Values; industries: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(productId ? updateProductAction : createProductAction, null);
  const [rows, setRows] = useState(() =>
    (values.specifications.length ? values.specifications : [{ label: "", value: "" }]).map((r) => ({ ...r, rowId: crypto.randomUUID() })),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state && !state.ok ? (state.fields ?? {}) : {};

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
      {state && !state.ok && <FormAlert kind="error">{state.error}</FormAlert>}
      {state?.ok && <FormAlert kind="success">Saved.</FormAlert>}
      {productId && <input type="hidden" name="productId" value={productId} />}
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Product name</FieldLabel>
          <Input id="name" name="name" defaultValue={values.name} maxLength={120} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
          <FieldMessage id="name-error" message={errors.name} />
        </Field>
        <Field data-invalid={!!errors.industryId}>
          <FieldLabel htmlFor="industryId">Industry</FieldLabel>
          <NativeSelect id="industryId" name="industryId" defaultValue={values.industryId} className="w-full" aria-invalid={!!errors.industryId} aria-describedby={errors.industryId ? "industryId-error" : undefined}>
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
        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea id="description" name="description" rows={6} maxLength={5000} defaultValue={values.description} aria-invalid={!!errors.description} aria-describedby={["description-hint", errors.description ? "description-error" : ""].filter(Boolean).join(" ")} />
          <p id="description-hint" className="text-sm text-muted-foreground">
            What it is, what it is made of, pack sizes, minimum order: whatever helps a buyer decide to call you.
          </p>
          <FieldMessage id="description-error" message={errors.description} />
        </Field>
      </FieldGroup>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-semibold">Specifications (optional)</legend>
        <p className="-mt-1 text-sm text-muted-foreground">For example: Material · SS 304, or Pack size · 200 g.</p>
        {rows.map((row, i) => (
          <div key={row.rowId} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor={`spec_label_${i}`} className="sr-only">
                Detail {i + 1} name
              </label>
              <Input id={`spec_label_${i}`} name={`spec_label_${i}`} placeholder="Detail" maxLength={60} value={row.label} onChange={(e) => update(row.rowId, "label", e.target.value)} aria-invalid={!!errors[`spec_label_${i}`]} />
              <FieldMessage id={`spec_label_${i}-error`} message={errors[`spec_label_${i}`]} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor={`spec_value_${i}`} className="sr-only">
                Detail {i + 1} value
              </label>
              <Input id={`spec_value_${i}`} name={`spec_value_${i}`} placeholder="Value" maxLength={200} value={row.value} onChange={(e) => update(row.rowId, "value", e.target.value)} aria-invalid={!!errors[`spec_value_${i}`]} />
              <FieldMessage id={`spec_value_${i}-error`} message={errors[`spec_value_${i}`]} />
            </div>
            <Button type="button" variant="ghost" size="icon-lg" aria-label={`Remove detail ${i + 1}`} onClick={() => setRows((current) => current.filter((r) => r.rowId !== row.rowId))}>
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        {rows.length < MAX_SPECIFICATIONS && (
          <Button type="button" variant="outline" className="w-fit" onClick={() => setRows((current) => [...current, { label: "", value: "", rowId: crypto.randomUUID() }])}>
            <Plus aria-hidden="true" /> Add a detail
          </Button>
        )}
      </fieldset>

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-fit">
        {pending ? "Saving…" : productId ? "Save changes" : "Create product and add photos"}
      </Button>
    </form>
  );
}
