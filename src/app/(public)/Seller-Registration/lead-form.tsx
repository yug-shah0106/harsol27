"use client";

import { CircleCheck, Download, MessageCircle } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { CopyButton } from "@/components/copy-button";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { useI18n } from "@/components/i18n";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { CONTACT } from "@/lib/contact";
import { PAYMENT_ACCOUNT, PAYMENT_QR_DOWNLOAD, PAYMENT_QR_SRC, rupees, type FeeToday } from "@/lib/fee";
import { DOCUMENT_TYPES } from "@/lib/file-type";
import { fill, formatLongDate, HTML_LANG, translateError } from "@/lib/i18n";
import { INDIAN_STATES } from "@/lib/indian-states";
import { BUSINESS_CATEGORIES, fieldErrors, leadSchema, NATIVE_PLACES, OTHER_INDUSTRY, OTHER_NATIVE_PLACE } from "@/lib/lead-schema";
import { DOCUMENT_MAX_BYTES } from "@/lib/seller-schema";
import { UTM_STORAGE_KEY } from "@/lib/utm";
import { createPaymentUploadAction, submitLeadAction } from "./actions";

type Industry = { id: string; name: string };
type UploadState = { status: "idle" } | { status: "uploading" } | { status: "done"; key: string; fileName: string } | { status: "error"; message: string };

const FIELD_ORDER = ["firstName", "fatherName", "lastName", "phone", "email", "nativePlace", "nativePlaceOther", "address", "city", "state", "pincode", "businessCategory", "industryIds", "industryOther", "website", "instagram", "mapsLink", "paymentProof"];

/** `industries`: already in the visitor's language and order (page.tsx). */
export function LeadForm({ industries, fee }: { industries: Industry[]; fee: FeeToday }) {
  const { locale, t } = useI18n();
  const r = t.registration;
  const [state, formAction, pending] = useActionState(submitLeadAction, null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [industry, setIndustry] = useState("");
  const [nativePlace, setNativePlace] = useState("");
  const [proof, setProof] = useState<UploadState>({ status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const serverErrors = state && !state.ok ? (state.fields ?? {}) : {};
  // The rules' messages are English; shown in the visitor's language.
  const errors = Object.fromEntries(Object.entries({ ...serverErrors, ...clientErrors }).map(([name, message]) => [name, translateError(t, message)]));
  // A to Z in the visitor's language, "Others" last.
  const categories = BUSINESS_CATEGORIES.map((c) => ({ value: c.value, label: t.categories[c.value] })).sort(
    (a, b) => Number(a.value === "OTHERS") - Number(b.value === "OTHERS") || a.label.localeCompare(b.label, HTML_LANG[locale]),
  );

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
          <p className="text-base">{r.thanks}</p>
          <p className="mt-1 font-normal text-foreground">{r.thanksMore}</p>
        </FormAlert>
        {/* The sellers' WhatsApp group, as in the confirmation email (client, 2026-10-30). */}
        <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4">
          <p>{r.joinGroup}</p>
          <Button asChild className="rounded-full">
            <a href={CONTACT.whatsappGroupLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" /> {r.joinGroupButton}
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // Same rules as the server, checked before sending so mistakes show instantly. The action is
  // dispatched by hand because React resets a form after its `action` runs, which would wipe the
  // visitor's input whenever the server rejects a field. Without JavaScript the form posts normally.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = leadSchema.safeParse({ ...Object.fromEntries(formData), industryIds: formData.getAll("industryIds") });
    if (!result.success) {
      const found = fieldErrors(result.error);
      setClientErrors(found);
      focusFirstError(event.currentTarget, found);
      return;
    }
    setClientErrors({});
    // The campaign this visit came from, if any (components/utm-capture.tsx).
    try {
      formData.set("utm", sessionStorage.getItem(UTM_STORAGE_KEY) ?? "");
    } catch {
      // Storage blocked: no campaign.
    }
    startTransition(() => formAction(formData));
  }

  const describe = (name: string) => (errors[name] ? `${name}-error` : undefined);
  const clear = (name: string) => () =>
    setClientErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== name)));

  // The screenshot goes straight to storage (like seller documents); the form only carries its key.
  async function uploadProof(file: File | undefined) {
    clear("paymentProof")();
    if (!file) return setProof({ status: "idle" });
    if (!(file.type in DOCUMENT_TYPES)) return setProof({ status: "error", message: r.fileType });
    if (file.size > DOCUMENT_MAX_BYTES) return setProof({ status: "error", message: r.fileSize });
    setProof({ status: "uploading" });
    try {
      const ticket = await createPaymentUploadAction({ fileName: file.name, contentType: file.type, sizeBytes: file.size });
      if (!ticket.ok) return setProof({ status: "error", message: ticket.error });
      const response = await fetch(ticket.data.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!response.ok) throw new Error(`Storage responded ${response.status}`);
      setProof({ status: "done", key: ticket.data.key, fileName: file.name });
    } catch (error) {
      console.error("Payment screenshot upload failed", error);
      setProof({ status: "error", message: r.uploadFailed });
    }
  }
  const proofMessage = proof.status === "error" ? translateError(t, proof.message) : errors.paymentProof;

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {state && !state.ok && <FormAlert kind="error">{translateError(t, state.error)}</FormAlert>}

      <FieldGroup>
        {/* The name in its three parts, side by side from 640px. */}
        <div className="grid gap-6 sm:grid-cols-3 sm:gap-4">
          {(
            [
              ["firstName", r.firstName, "given-name"],
              ["fatherName", r.middleName, "additional-name"],
              ["lastName", r.lastName, "family-name"],
            ] as const
          ).map(([name, label, autoComplete]) => (
            <Field key={name} data-invalid={!!errors[name]}>
              <FieldLabel htmlFor={name}>{label}</FieldLabel>
              <Input id={name} name={name} autoComplete={autoComplete} required maxLength={50} aria-invalid={!!errors[name]} aria-describedby={describe(name)} onChange={clear(name)} />
              <FieldMessage id={`${name}-error`} message={errors[name]} />
            </Field>
          ))}
        </div>

        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="phone">{r.whatsapp}</FieldLabel>
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={32} placeholder="98765 43210" aria-invalid={!!errors.phone} aria-describedby={["phone-hint", describe("phone")].filter(Boolean).join(" ")} onChange={clear("phone")} />
          <p id="phone-hint" className="text-sm text-muted-foreground">
            {r.phoneHint}
          </p>
          <FieldMessage id="phone-error" message={errors.phone} />
        </Field>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">{r.email}</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} aria-invalid={!!errors.email} aria-describedby={describe("email")} onChange={clear("email")} />
          <FieldMessage id="email-error" message={errors.email} />
        </Field>

        <Field data-invalid={!!errors.nativePlace}>
          <FieldLabel htmlFor="nativePlace">{r.nativePlace}</FieldLabel>
          <Dropdown
            id="nativePlace"
            name="nativePlace"
            required
            placeholder={r.nativePlacePlaceholder}
            className="w-full"
            aria-invalid={!!errors.nativePlace}
            aria-describedby={describe("nativePlace")}
            onValueChange={(value) => {
              setNativePlace(value);
              clear("nativePlace")();
            }}
            searchable={{ placeholder: r.nativePlaceSearch }}
            options={[...NATIVE_PLACES.map((p) => ({ value: p, label: p })), { value: OTHER_NATIVE_PLACE, label: t.common.otherNotListed, pinned: true }]}
          />
          <FieldMessage id="nativePlace-error" message={errors.nativePlace} />
        </Field>

        {nativePlace === OTHER_NATIVE_PLACE && (
          <Field data-invalid={!!errors.nativePlaceOther}>
            <FieldLabel htmlFor="nativePlaceOther">{r.nativePlaceOther}</FieldLabel>
            <Input
              id="nativePlaceOther"
              name="nativePlaceOther"
              required
              maxLength={100}
              placeholder={r.nativePlaceOtherPlaceholder}
              aria-invalid={!!errors.nativePlaceOther}
              aria-describedby={describe("nativePlaceOther")}
              onChange={clear("nativePlaceOther")}
            />
            <FieldMessage id="nativePlaceOther-error" message={errors.nativePlaceOther} />
          </Field>
        )}

        <Field data-invalid={!!errors.address}>
          <FieldLabel htmlFor="address">{r.address}</FieldLabel>
          <Input id="address" name="address" autoComplete="street-address" required maxLength={300} aria-invalid={!!errors.address} aria-describedby={describe("address")} onChange={clear("address")} />
          <FieldMessage id="address-error" message={errors.address} />
        </Field>

        {/* City and state side by side from 640px, the pincode under the city. */}
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
          <Field data-invalid={!!errors.city}>
            <FieldLabel htmlFor="city">{r.city}</FieldLabel>
            <Input id="city" name="city" autoComplete="address-level2" required maxLength={80} aria-invalid={!!errors.city} aria-describedby={describe("city")} onChange={clear("city")} />
            <FieldMessage id="city-error" message={errors.city} />
          </Field>
          <Field data-invalid={!!errors.state}>
            <FieldLabel htmlFor="state">{r.state}</FieldLabel>
            <Dropdown
              id="state"
              name="state"
              required
              placeholder={r.statePlaceholder}
              className="w-full"
              aria-invalid={!!errors.state}
              aria-describedby={describe("state")}
              onValueChange={clear("state")}
              searchable={{ placeholder: r.stateSearch }}
              options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
            />
            <FieldMessage id="state-error" message={errors.state} />
          </Field>
          <Field data-invalid={!!errors.pincode}>
            <FieldLabel htmlFor="pincode">{r.pincode}</FieldLabel>
            <Input id="pincode" name="pincode" inputMode="numeric" autoComplete="postal-code" required maxLength={7} placeholder="380001" aria-invalid={!!errors.pincode} aria-describedby={describe("pincode")} onChange={clear("pincode")} />
            <FieldMessage id="pincode-error" message={errors.pincode} />
          </Field>
        </div>

        <Field data-invalid={!!errors.businessCategory}>
          <FieldLabel htmlFor="businessCategory">{r.category}</FieldLabel>
          <Dropdown
            id="businessCategory"
            name="businessCategory"
            required
            placeholder={r.categoryPlaceholder}
            className="w-full"
            aria-invalid={!!errors.businessCategory}
            aria-describedby={describe("businessCategory")}
            onValueChange={clear("businessCategory")}
            options={categories}
          />
          <FieldMessage id="businessCategory-error" message={errors.businessCategory} />
        </Field>

        <Field data-invalid={!!errors.industryIds}>
          <FieldLabel htmlFor="industryIds">{r.industry}</FieldLabel>
          <Dropdown
            id="industryIds"
            name="industryIds"
            required
            placeholder={r.industryPlaceholder}
            className="w-full"
            aria-invalid={!!errors.industryIds}
            aria-describedby={describe("industryIds")}
            onValueChange={(value) => {
              setIndustry(value);
              clear("industryIds")();
            }}
            searchable={{ placeholder: r.industrySearch }}
            options={[...industries.map((i) => ({ value: i.id, label: i.name })), { value: OTHER_INDUSTRY, label: t.common.otherNotListed, pinned: true }]}
          />
          <FieldMessage id="industryIds-error" message={errors.industryIds} />
        </Field>

        {industry === OTHER_INDUSTRY && (
          <Field data-invalid={!!errors.industryOther}>
            <FieldLabel htmlFor="industryOther">{r.industryOther}</FieldLabel>
            <Input
              id="industryOther"
              name="industryOther"
              required
              maxLength={80}
              placeholder={r.industryOtherPlaceholder}
              aria-invalid={!!errors.industryOther}
              aria-describedby={describe("industryOther")}
              onChange={clear("industryOther")}
            />
            <FieldMessage id="industryOther-error" message={errors.industryOther} />
          </Field>
        )}
      </FieldGroup>

      {/* Optional: helps our team look the business up before calling. */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-medium">
          {r.links} <span className="font-normal text-muted-foreground">{r.optional}</span>
        </legend>
        <Field data-invalid={!!errors.website}>
          <FieldLabel htmlFor="website">{r.website}</FieldLabel>
          <Input id="website" name="website" type="url" inputMode="url" autoComplete="url" maxLength={300} placeholder="www.yourshop.com" aria-invalid={!!errors.website} aria-describedby={describe("website")} onChange={clear("website")} />
          <FieldMessage id="website-error" message={errors.website} />
        </Field>
        <Field data-invalid={!!errors.instagram}>
          <FieldLabel htmlFor="instagram">{r.instagram}</FieldLabel>
          <Input id="instagram" name="instagram" maxLength={200} autoCapitalize="none" placeholder="@yourshop" aria-invalid={!!errors.instagram} aria-describedby={describe("instagram")} onChange={clear("instagram")} />
          <FieldMessage id="instagram-error" message={errors.instagram} />
        </Field>
        <Field data-invalid={!!errors.mapsLink}>
          <FieldLabel htmlFor="mapsLink">{r.maps}</FieldLabel>
          <Input id="mapsLink" name="mapsLink" type="url" inputMode="url" maxLength={300} placeholder={r.mapsPlaceholder} aria-invalid={!!errors.mapsLink} aria-describedby={describe("mapsLink")} onChange={clear("mapsLink")} />
          <FieldMessage id="mapsLink-error" message={errors.mapsLink} />
        </Field>
      </fieldset>

      {/* Paid by UPI to the team's QR code; the team checks the screenshot (no payment gateway). */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-medium">{r.pay}</legend>
        <div className="flex flex-col gap-5 rounded-xl border border-border bg-secondary/60 p-4 sm:p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-2">
              {/* A plain <img>: a QR code must stay pixel-exact to scan, and next/image adds an inline style our CSP blocks. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={PAYMENT_QR_SRC}
                alt={fill(r.qrAlt, { name: PAYMENT_ACCOUNT.name })}
                width={176}
                height={176}
                className="size-44 rounded-lg border border-border bg-white p-2"
              />
              {/* A PNG: on a phone, UPI apps scan a saved QR code from the photos. */}
              <a href={PAYMENT_QR_DOWNLOAD} download="harsol27-upi-qr.png" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline">
                <Download aria-hidden="true" className="size-4" />
                {r.saveQr}
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                {fee.offerLastDay && (
                  <s className="font-display text-2xl leading-none text-muted-foreground">
                    <span className="sr-only">{r.usualPrice}</span>
                    {rupees(fee.regular)}
                  </s>
                )}
                <span className="font-display text-4xl leading-none text-primary">{rupees(fee.amount)}</span>
                <span className="text-sm font-medium">{fill(r.forMonths, { months: fee.months })}</span>
              </p>
              {fee.offerLastDay && (
                <p className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold">{fill(r.offerTill, { date: formatLongDate(fee.offerLastDay, locale) })}</p>
              )}
              <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
                {r.paySteps.map((step) => (
                  <li key={step}>{fill(step, { amount: rupees(fee.amount) })}</li>
                ))}
              </ol>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">{r.bankTitle}</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                { label: r.accountName, value: PAYMENT_ACCOUNT.name, wide: true },
                { label: r.upiId, value: PAYMENT_ACCOUNT.upiId, copy: true },
                { label: r.accountNumber, value: PAYMENT_ACCOUNT.accountNumber, copy: true },
                { label: r.ifsc, value: PAYMENT_ACCOUNT.ifsc, copy: true },
                { label: r.bank, value: PAYMENT_ACCOUNT.bank, note: fill(r.branch, { branch: PAYMENT_ACCOUNT.branch }) },
              ].map((item) => (
                <div key={item.label} className={item.wide ? "sm:col-span-2" : undefined}>
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="flex min-h-8 items-center gap-1 font-medium">
                    <span>
                      {item.value}
                      {item.note && <span className="block font-normal text-muted-foreground">{item.note}</span>}
                    </span>
                    {item.copy && <CopyButton value={item.value} what={item.label} compact />}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <Field data-invalid={!!proofMessage}>
          <FieldLabel htmlFor="paymentProof">{r.screenshot}</FieldLabel>
          <input type="hidden" name="paymentProof" value={proof.status === "done" ? proof.key : ""} />
          <Input
            id="paymentProof"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            className="h-auto py-2"
            aria-invalid={!!proofMessage}
            aria-describedby={["paymentProof-hint", "paymentProof-status", proofMessage ? "paymentProof-error" : ""].filter(Boolean).join(" ")}
            onChange={(e) => void uploadProof(e.target.files?.[0])}
          />
          <p id="paymentProof-hint" className="text-sm text-muted-foreground">
            {r.screenshotHint}
          </p>
          <p id="paymentProof-status" aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
            {proof.status === "uploading" && r.uploading}
            {proof.status === "done" && (
              <span className="flex items-center gap-1.5 text-success">
                <CircleCheck aria-hidden="true" className="size-4" /> {fill(r.uploaded, { name: proof.fileName })}
              </span>
            )}
          </p>
          <FieldMessage id="paymentProof-error" message={proofMessage} />
        </Field>
      </fieldset>

      <p className="text-sm text-muted-foreground">{r.allRequired}</p>

      <Button type="submit" size="lg" disabled={pending || proof.status === "uploading"} className="w-full sm:w-fit">
        {pending ? r.sending : proof.status === "uploading" ? r.uploadingButton : r.submit}
      </Button>
    </form>
  );
}

function focusFirstError(form: HTMLFormElement | null, errors: Record<string, string>) {
  const name = FIELD_ORDER.find((f) => errors[f]);
  if (name) form?.querySelector<HTMLElement>(`#${name}`)?.focus();
}
