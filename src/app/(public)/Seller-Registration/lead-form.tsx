"use client";

import { CircleCheck, Download } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { CopyButton } from "@/components/copy-button";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { PAYMENT_ACCOUNT, PAYMENT_QR_DOWNLOAD, PAYMENT_QR_SRC, longDate, rupees, type FeeToday } from "@/lib/fee";
import { DOCUMENT_TYPES } from "@/lib/file-type";
import { INDIAN_STATES } from "@/lib/indian-states";
import { BUSINESS_CATEGORIES, fieldErrors, leadSchema, NATIVE_PLACES, OTHER_INDUSTRY, OTHER_NATIVE_PLACE } from "@/lib/lead-schema";
import { DOCUMENT_MAX_BYTES } from "@/lib/seller-schema";
import { UTM_STORAGE_KEY } from "@/lib/utm";
import { createPaymentUploadAction, submitLeadAction } from "./actions";

type Industry = { id: string; name: string };
type UploadState = { status: "idle" } | { status: "uploading" } | { status: "done"; key: string; fileName: string } | { status: "error"; message: string };

const FIELD_ORDER = ["firstName", "fatherName", "lastName", "phone", "email", "nativePlace", "nativePlaceOther", "address", "city", "state", "pincode", "businessCategory", "industryIds", "industryOther", "website", "instagram", "mapsLink", "paymentProof"];

export function LeadForm({ industries, fee }: { industries: Industry[]; fee: FeeToday }) {
  const [state, formAction, pending] = useActionState(submitLeadAction, null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [industry, setIndustry] = useState("");
  const [nativePlace, setNativePlace] = useState("");
  const [proof, setProof] = useState<UploadState>({ status: "idle" });
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
    if (!(file.type in DOCUMENT_TYPES)) return setProof({ status: "error", message: "Upload a JPG, PNG or PDF file." });
    if (file.size > DOCUMENT_MAX_BYTES) return setProof({ status: "error", message: "The file must be 5 MB or smaller." });
    setProof({ status: "uploading" });
    try {
      const ticket = await createPaymentUploadAction({ fileName: file.name, contentType: file.type, sizeBytes: file.size });
      if (!ticket.ok) return setProof({ status: "error", message: ticket.error });
      const response = await fetch(ticket.data.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!response.ok) throw new Error(`Storage responded ${response.status}`);
      setProof({ status: "done", key: ticket.data.key, fileName: file.name });
    } catch (error) {
      console.error("Payment screenshot upload failed", error);
      setProof({ status: "error", message: "The upload failed. Check your connection and choose the file again." });
    }
  }
  const proofMessage = proof.status === "error" ? proof.message : errors.paymentProof;

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {state && !state.ok && <FormAlert kind="error">{state.error}</FormAlert>}

      <FieldGroup>
        {/* The name in its three parts, side by side from 640px. */}
        <div className="grid gap-6 sm:grid-cols-3 sm:gap-4">
          {(
            [
              ["firstName", "First name", "given-name"],
              ["fatherName", "Middle name", "additional-name"],
              ["lastName", "Last name", "family-name"],
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
          <FieldLabel htmlFor="phone">WhatsApp number</FieldLabel>
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

        <Field data-invalid={!!errors.nativePlace}>
          <FieldLabel htmlFor="nativePlace">Native place</FieldLabel>
          <Dropdown
            id="nativePlace"
            name="nativePlace"
            required
            placeholder="Choose your village or town"
            className="w-full"
            aria-invalid={!!errors.nativePlace}
            aria-describedby={describe("nativePlace")}
            onValueChange={(value) => {
              setNativePlace(value);
              clear("nativePlace")();
            }}
            searchable={{ placeholder: "Search places" }}
            options={[...NATIVE_PLACES.map((p) => ({ value: p, label: p })), { value: OTHER_NATIVE_PLACE, label: "Other (not listed)", pinned: true }]}
          />
          <FieldMessage id="nativePlace-error" message={errors.nativePlace} />
        </Field>

        {nativePlace === OTHER_NATIVE_PLACE && (
          <Field data-invalid={!!errors.nativePlaceOther}>
            <FieldLabel htmlFor="nativePlaceOther">Your native place</FieldLabel>
            <Input
              id="nativePlaceOther"
              name="nativePlaceOther"
              required
              maxLength={100}
              placeholder="Village or town"
              aria-invalid={!!errors.nativePlaceOther}
              aria-describedby={describe("nativePlaceOther")}
              onChange={clear("nativePlaceOther")}
            />
            <FieldMessage id="nativePlaceOther-error" message={errors.nativePlaceOther} />
          </Field>
        )}

        <Field data-invalid={!!errors.address}>
          <FieldLabel htmlFor="address">Address</FieldLabel>
          <Input id="address" name="address" autoComplete="street-address" required maxLength={300} aria-invalid={!!errors.address} aria-describedby={describe("address")} onChange={clear("address")} />
          <FieldMessage id="address-error" message={errors.address} />
        </Field>

        {/* City and state side by side from 640px, the pincode under the city. */}
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
          <Field data-invalid={!!errors.city}>
            <FieldLabel htmlFor="city">City</FieldLabel>
            <Input id="city" name="city" autoComplete="address-level2" required maxLength={80} aria-invalid={!!errors.city} aria-describedby={describe("city")} onChange={clear("city")} />
            <FieldMessage id="city-error" message={errors.city} />
          </Field>
          <Field data-invalid={!!errors.state}>
            <FieldLabel htmlFor="state">State</FieldLabel>
            <Dropdown
              id="state"
              name="state"
              required
              placeholder="Choose your state"
              className="w-full"
              aria-invalid={!!errors.state}
              aria-describedby={describe("state")}
              onValueChange={clear("state")}
              searchable={{ placeholder: "Search states" }}
              options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
            />
            <FieldMessage id="state-error" message={errors.state} />
          </Field>
          <Field data-invalid={!!errors.pincode}>
            <FieldLabel htmlFor="pincode">Pincode</FieldLabel>
            <Input id="pincode" name="pincode" inputMode="numeric" autoComplete="postal-code" required maxLength={7} placeholder="380001" aria-invalid={!!errors.pincode} aria-describedby={describe("pincode")} onChange={clear("pincode")} />
            <FieldMessage id="pincode-error" message={errors.pincode} />
          </Field>
        </div>

        <Field data-invalid={!!errors.businessCategory}>
          <FieldLabel htmlFor="businessCategory">Category</FieldLabel>
          <Dropdown
            id="businessCategory"
            name="businessCategory"
            required
            placeholder="Choose a category"
            className="w-full"
            aria-invalid={!!errors.businessCategory}
            aria-describedby={describe("businessCategory")}
            onValueChange={clear("businessCategory")}
            options={BUSINESS_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          />
          <FieldMessage id="businessCategory-error" message={errors.businessCategory} />
        </Field>

        <Field data-invalid={!!errors.industryIds}>
          <FieldLabel htmlFor="industryIds">Industry</FieldLabel>
          <Dropdown
            id="industryIds"
            name="industryIds"
            required
            placeholder="Choose your industry"
            className="w-full"
            aria-invalid={!!errors.industryIds}
            aria-describedby={describe("industryIds")}
            onValueChange={(value) => {
              setIndustry(value);
              clear("industryIds")();
            }}
            searchable={{ placeholder: "Search industries" }}
            options={[...industries.map((i) => ({ value: i.id, label: i.name })), { value: OTHER_INDUSTRY, label: "Other (not listed)", pinned: true }]}
          />
          <FieldMessage id="industryIds-error" message={errors.industryIds} />
        </Field>

        {industry === OTHER_INDUSTRY && (
          <Field data-invalid={!!errors.industryOther}>
            <FieldLabel htmlFor="industryOther">Your industry</FieldLabel>
            <Input
              id="industryOther"
              name="industryOther"
              required
              maxLength={80}
              placeholder="For example: solar panels"
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
          Links to your business <span className="font-normal text-muted-foreground">(optional)</span>
        </legend>
        <Field data-invalid={!!errors.website}>
          <FieldLabel htmlFor="website">Website</FieldLabel>
          <Input id="website" name="website" type="url" inputMode="url" autoComplete="url" maxLength={300} placeholder="www.yourshop.com" aria-invalid={!!errors.website} aria-describedby={describe("website")} onChange={clear("website")} />
          <FieldMessage id="website-error" message={errors.website} />
        </Field>
        <Field data-invalid={!!errors.instagram}>
          <FieldLabel htmlFor="instagram">Instagram</FieldLabel>
          <Input id="instagram" name="instagram" maxLength={200} autoCapitalize="none" placeholder="@yourshop" aria-invalid={!!errors.instagram} aria-describedby={describe("instagram")} onChange={clear("instagram")} />
          <FieldMessage id="instagram-error" message={errors.instagram} />
        </Field>
        <Field data-invalid={!!errors.mapsLink}>
          <FieldLabel htmlFor="mapsLink">Google Maps link</FieldLabel>
          <Input id="mapsLink" name="mapsLink" type="url" inputMode="url" maxLength={300} placeholder="Paste the link from Google Maps" aria-invalid={!!errors.mapsLink} aria-describedby={describe("mapsLink")} onChange={clear("mapsLink")} />
          <FieldMessage id="mapsLink-error" message={errors.mapsLink} />
        </Field>
      </fieldset>

      {/* Paid by UPI to the team's QR code; the team checks the screenshot (no payment gateway). */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-medium">Pay the fee</legend>
        <div className="flex flex-col gap-5 rounded-xl border border-border bg-secondary/60 p-4 sm:p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-2">
              {/* A plain <img>: a QR code must stay pixel-exact to scan, and next/image adds an inline style our CSP blocks. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={PAYMENT_QR_SRC}
                alt={`UPI QR code for paying ${PAYMENT_ACCOUNT.name}`}
                width={176}
                height={176}
                className="size-44 rounded-lg border border-border bg-white p-2"
              />
              {/* A PNG: on a phone, UPI apps scan a saved QR code from the photos. */}
              <a href={PAYMENT_QR_DOWNLOAD} download="harsol27-upi-qr.png" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline">
                <Download aria-hidden="true" className="size-4" />
                Save the QR code
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                {fee.offerLastDay && (
                  <s className="font-display text-2xl leading-none text-muted-foreground">
                    <span className="sr-only">Usual price </span>
                    {rupees(fee.regular)}
                  </s>
                )}
                <span className="font-display text-4xl leading-none text-primary">{rupees(fee.amount)}</span>
                <span className="text-sm font-medium">for {fee.months} months</span>
              </p>
              {fee.offerLastDay && (
                <p className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold">Offer price till {longDate(fee.offerLastDay)}</p>
              )}
              <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
                <li>Scan the QR code with any UPI app, like Google Pay, PhonePe or Paytm, or use the details below.</li>
                <li>Pay {rupees(fee.amount)}.</li>
                <li>Take a screenshot of the payment and add it below.</li>
              </ol>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Pay by UPI ID or bank transfer</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                { label: "Account name", value: PAYMENT_ACCOUNT.name, wide: true },
                { label: "UPI ID", value: PAYMENT_ACCOUNT.upiId, copy: true },
                { label: "Account number", value: PAYMENT_ACCOUNT.accountNumber, copy: true },
                { label: "IFSC", value: PAYMENT_ACCOUNT.ifsc, copy: true },
                { label: "Bank", value: PAYMENT_ACCOUNT.bank, note: `${PAYMENT_ACCOUNT.branch} branch` },
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
          <FieldLabel htmlFor="paymentProof">Payment screenshot</FieldLabel>
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
            JPG, PNG or PDF, up to 5 MB. Only the Harsol27 team can see it.
          </p>
          <p id="paymentProof-status" aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
            {proof.status === "uploading" && "Uploading…"}
            {proof.status === "done" && (
              <span className="flex items-center gap-1.5 text-success">
                <CircleCheck aria-hidden="true" className="size-4" /> Uploaded: {proof.fileName}
              </span>
            )}
          </p>
          <FieldMessage id="paymentProof-error" message={proofMessage} />
        </Field>
      </fieldset>

      <p className="text-sm text-muted-foreground">All fields are required, except the links.</p>

      <Button type="submit" size="lg" disabled={pending || proof.status === "uploading"} className="w-full sm:w-fit">
        {pending ? "Sending…" : proof.status === "uploading" ? "Uploading screenshot…" : "Submit"}
      </Button>
    </form>
  );
}

function focusFirstError(form: HTMLFormElement | null, errors: Record<string, string>) {
  const name = FIELD_ORDER.find((f) => errors[f]);
  if (name) form?.querySelector<HTMLElement>(`#${name}`)?.focus();
}
