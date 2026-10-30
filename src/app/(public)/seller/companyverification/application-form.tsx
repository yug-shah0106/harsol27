"use client";

import { CircleCheck } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { useI18n } from "@/components/i18n";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_TYPES } from "@/lib/file-type";
import { fill, translateError } from "@/lib/i18n";
import { fieldErrors } from "@/lib/lead-schema";
import { DOCUMENT_MAX_BYTES, INDIAN_STATES, SELLER_DOCUMENTS, sellerApplicationSchema } from "@/lib/seller-schema";
import { createUploadAction, saveCompanyDetailsAction } from "./actions";

export type ApplicationDefaults = {
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  city: string;
  state: string;
  description: string;
  /** Current file name per document kind, when saving again. */
  existingDocuments: Partial<Record<string, string>>;
};

type UploadState = { status: "idle" } | { status: "uploading" } | { status: "done"; key: string; fileName: string } | { status: "error"; message: string };

const TEXT_FIELDS = ["companyName", "contactName", "contactPhone", "contactEmail", "address", "city", "state", "description"] as const;

export function ApplicationForm({ defaults, resubmission }: { defaults: ApplicationDefaults; resubmission: boolean }) {
  const { t } = useI18n();
  const s = t.sellerArea;
  const [state, formAction, pending] = useActionState(saveCompanyDetailsAction, null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const formRef = useRef<HTMLFormElement>(null);

  // The rules' messages are English; shown in the visitor's language.
  const errors = Object.fromEntries(
    Object.entries({ ...(state && !state.ok ? (state.fields ?? {}) : {}), ...clientErrors }).map(([name, message]) => [name, translateError(t, message)]),
  );
  const busy = pending || Object.values(uploads).some((u) => u.status === "uploading");

  useEffect(() => {
    if (state && !state.ok) focusFirst(formRef.current, state.fields ?? {});
  }, [state]);

  async function upload(kind: string, file: File | undefined) {
    const field = `doc_${kind}`;
    setClientErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== field)));
    if (!file) return setUploads((u) => ({ ...u, [kind]: { status: "idle" } }));
    if (!(file.type in DOCUMENT_TYPES)) return setUploads((u) => ({ ...u, [kind]: { status: "error", message: t.registration.fileType } }));
    if (file.size > DOCUMENT_MAX_BYTES) return setUploads((u) => ({ ...u, [kind]: { status: "error", message: t.registration.fileSize } }));

    setUploads((u) => ({ ...u, [kind]: { status: "uploading" } }));
    try {
      const ticket = await createUploadAction({ kind, fileName: file.name, contentType: file.type, sizeBytes: file.size });
      if (!ticket.ok) return setUploads((u) => ({ ...u, [kind]: { status: "error", message: ticket.error } }));
      const response = await fetch(ticket.data.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!response.ok) throw new Error(`Storage responded ${response.status}`);
      setUploads((u) => ({ ...u, [kind]: { status: "done", key: ticket.data.key, fileName: file.name } }));
    } catch (error) {
      console.error("Document upload failed", error);
      setUploads((u) => ({ ...u, [kind]: { status: "error", message: t.registration.uploadFailed } }));
    }
  }

  // Validated here first (same rules as the server); dispatched by hand so React does not clear the form.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = sellerApplicationSchema.safeParse(Object.fromEntries(TEXT_FIELDS.map((f) => [f, String(formData.get(f) ?? "") || (f === "description" ? undefined : "")])));
    const found: Record<string, string> = result.success ? {} : fieldErrors(result.error);
    setClientErrors(found);
    if (Object.keys(found).length) return focusFirst(event.currentTarget, found);
    startTransition(() => formAction(formData));
  }

  const text = (name: (typeof TEXT_FIELDS)[number], label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} defaultValue={defaults[name]} required aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} {...props} />
      <FieldMessage id={`${name}-error`} message={errors[name]} />
    </Field>
  );

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      {state && !state.ok && <FormAlert kind="error">{translateError(t, state.error)}</FormAlert>}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">{s.company}</legend>
        <FieldGroup>
          {text("companyName", s.companyName, { maxLength: 120, autoComplete: "organization" })}
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
              defaultValue={defaults.state || "Gujarat"}
              className="w-full"
              aria-invalid={!!errors.state}
              aria-describedby={errors.state ? "state-error" : undefined}
              options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
            />
            <FieldMessage id="state-error" message={errors.state} />
          </Field>
          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="description">{s.about}</FieldLabel>
            <Textarea id="description" name="description" rows={4} maxLength={1000} defaultValue={defaults.description} aria-invalid={!!errors.description} aria-describedby={errors.description ? "description-error" : undefined} />
            <FieldMessage id="description-error" message={errors.description} />
          </Field>
        </FieldGroup>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">{s.documents}</legend>
        <p id="docs-hint" className="-mt-2 text-sm text-muted-foreground">
          {s.docsHint}
          {resubmission && s.replaceHint}
        </p>
        {SELLER_DOCUMENTS.map(({ kind, required }) => {
          const field = `doc_${kind}`;
          const u = uploads[kind] ?? { status: "idle" };
          const message = u.status === "error" ? u.message : errors[field];
          return (
            <Field key={kind} data-invalid={!!message}>
              <FieldLabel htmlFor={`file-${kind}`}>
                {s.docs[kind]}
                {!required && s.optional}
              </FieldLabel>
              <input type="hidden" name={field} value={u.status === "done" ? u.key : ""} />
              <Input
                id={`file-${kind}`}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="h-auto py-2"
                aria-invalid={!!message}
                aria-describedby={["docs-hint", `${field}-status`, message ? `${field}-error` : ""].filter(Boolean).join(" ")}
                onChange={(e) => void upload(kind, e.target.files?.[0])}
              />
              <p id={`${field}-status`} aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {u.status === "uploading" && t.registration.uploading}
                {u.status === "done" && (
                  <span className="flex items-center gap-1.5 text-success">
                    <CircleCheck aria-hidden="true" className="size-4" /> {fill(t.registration.uploaded, { name: u.fileName })}
                  </span>
                )}
                {u.status !== "uploading" && u.status !== "done" && defaults.existingDocuments[kind] && fill(s.currentFile, { name: defaults.existingDocuments[kind] ?? "" })}
              </p>
              <FieldMessage id={`${field}-error`} message={message} />
            </Field>
          );
        })}
      </fieldset>

      <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-fit">
        {pending ? s.saving : s.saveCompany}
      </Button>
    </form>
  );
}

function focusFirst(form: HTMLFormElement | null, errors: Record<string, string>) {
  const name = Object.keys(errors)[0];
  if (!name) return;
  const id = name.startsWith("doc_") ? `file-${name.slice(4)}` : name;
  form?.querySelector<HTMLElement>(`#${id}`)?.focus();
}
