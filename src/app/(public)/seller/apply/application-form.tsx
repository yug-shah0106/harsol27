"use client";

import { CircleCheck } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_TYPES } from "@/lib/file-type";
import { fieldErrors } from "@/lib/lead-schema";
import { DOCUMENT_MAX_BYTES, INDIAN_STATES, SELLER_DOCUMENTS, sellerApplicationSchema } from "@/lib/seller-schema";
import { createUploadAction, submitApplicationAction } from "./actions";

export type ApplicationDefaults = {
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  city: string;
  state: string;
  description: string;
  /** Current file name per document kind, when resubmitting after a rejection. */
  existingDocuments: Partial<Record<string, string>>;
};

type UploadState = { status: "idle" } | { status: "uploading" } | { status: "done"; key: string; fileName: string } | { status: "error"; message: string };

const TEXT_FIELDS = ["companyName", "contactName", "contactPhone", "contactEmail", "address", "city", "state", "description"] as const;

export function ApplicationForm({ defaults, resubmission }: { defaults: ApplicationDefaults; resubmission: boolean }) {
  const [state, formAction, pending] = useActionState(submitApplicationAction, null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const errors = { ...(state && !state.ok ? (state.fields ?? {}) : {}), ...clientErrors };
  const busy = pending || Object.values(uploads).some((u) => u.status === "uploading");

  useEffect(() => {
    if (state && !state.ok) focusFirst(formRef.current, state.fields ?? {});
  }, [state]);

  async function upload(kind: string, file: File | undefined) {
    const field = `doc_${kind}`;
    setClientErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== field)));
    if (!file) return setUploads((u) => ({ ...u, [kind]: { status: "idle" } }));
    if (!(file.type in DOCUMENT_TYPES)) return setUploads((u) => ({ ...u, [kind]: { status: "error", message: "Upload a PDF, JPG or PNG file." } }));
    if (file.size > DOCUMENT_MAX_BYTES) return setUploads((u) => ({ ...u, [kind]: { status: "error", message: "Files must be 5 MB or smaller." } }));

    setUploads((u) => ({ ...u, [kind]: { status: "uploading" } }));
    try {
      const ticket = await createUploadAction({ kind, fileName: file.name, contentType: file.type, sizeBytes: file.size });
      if (!ticket.ok) return setUploads((u) => ({ ...u, [kind]: { status: "error", message: ticket.error } }));
      const response = await fetch(ticket.data.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!response.ok) throw new Error(`Storage responded ${response.status}`);
      setUploads((u) => ({ ...u, [kind]: { status: "done", key: ticket.data.key, fileName: file.name } }));
    } catch (error) {
      console.error("Document upload failed", error);
      setUploads((u) => ({ ...u, [kind]: { status: "error", message: "The upload failed. Check your connection and choose the file again." } }));
    }
  }

  // Validated here first (same rules as the server); dispatched by hand so React does not clear the form.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = sellerApplicationSchema.safeParse(Object.fromEntries(TEXT_FIELDS.map((f) => [f, String(formData.get(f) ?? "") || (f === "description" ? undefined : "")])));
    const found: Record<string, string> = result.success ? {} : fieldErrors(result.error);
    for (const { kind, label, required } of SELLER_DOCUMENTS) {
      if (required && !formData.get(`doc_${kind}`) && !defaults.existingDocuments[kind]) found[`doc_${kind}`] = `Upload your ${label}.`;
    }
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
      {state && !state.ok && <FormAlert kind="error">{state.error}</FormAlert>}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">Company details</legend>
        <FieldGroup>
          {text("companyName", "Company name", { maxLength: 120, autoComplete: "organization" })}
          {text("contactName", "Contact person", { maxLength: 100, autoComplete: "name" })}
          {text("contactPhone", "Contact phone", { type: "tel", inputMode: "tel", maxLength: 32, autoComplete: "tel" })}
          {text("contactEmail", "Contact email", { type: "email", maxLength: 254, autoComplete: "email" })}
          {text("address", "Business address", { maxLength: 300, autoComplete: "street-address" })}
          {text("city", "City", { maxLength: 80, autoComplete: "address-level2" })}
          <Field data-invalid={!!errors.state}>
            <FieldLabel htmlFor="state">State</FieldLabel>
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
            <FieldLabel htmlFor="description">About your business (optional)</FieldLabel>
            <Textarea id="description" name="description" rows={4} maxLength={1000} defaultValue={defaults.description} aria-invalid={!!errors.description} aria-describedby={errors.description ? "description-error" : undefined} />
            <FieldMessage id="description-error" message={errors.description} />
          </Field>
        </FieldGroup>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">Documents</legend>
        <p id="docs-hint" className="-mt-2 text-sm text-muted-foreground">
          PDF, JPG or PNG, up to 5 MB each. The GST certificate is optional if your business is not
          registered for GST. Only the Harsol27 team can see your documents.
          {resubmission && " Choose a file only for the documents you want to replace."}
        </p>
        {SELLER_DOCUMENTS.map(({ kind, label, required }) => {
          const field = `doc_${kind}`;
          const u = uploads[kind] ?? { status: "idle" };
          const message = u.status === "error" ? u.message : errors[field];
          return (
            <Field key={kind} data-invalid={!!message}>
              <FieldLabel htmlFor={`file-${kind}`}>
                {label}
                {!required && " (optional)"}
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
                {u.status === "uploading" && "Uploading…"}
                {u.status === "done" && (
                  <span className="flex items-center gap-1.5 text-success">
                    <CircleCheck aria-hidden="true" className="size-4" /> Uploaded: {u.fileName}
                  </span>
                )}
                {u.status !== "uploading" && u.status !== "done" && defaults.existingDocuments[kind] && `Current file: ${defaults.existingDocuments[kind]}`}
              </p>
              <FieldMessage id={`${field}-error`} message={message} />
            </Field>
          );
        })}
      </fieldset>

      <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-fit">
        {pending ? "Submitting…" : resubmission ? "Submit again" : "Submit application"}
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
