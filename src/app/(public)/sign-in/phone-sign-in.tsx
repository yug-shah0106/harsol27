"use client";

// Sign-in by SMS code: switched off until an SMS provider is connected (docs/FUTURE.md). Nothing renders
// this, so its actions (phone-actions.ts) are not part of the site. To bring it back, render it on the sign-in page.

import { useActionState, useEffect, useRef, useState } from "react";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestOtpAction, verifyOtpAction, type CodeSent } from "./phone-actions";

export function PhoneSignIn({ next }: { next: string }) {
  const [sendState, sendAction, sending] = useActionState(requestOtpAction, null);
  const [verifyState, verifyAction, verifying] = useActionState(verifyOtpAction, null);
  // "Use a different number" hides the code step for the result it was clicked on; a new send shows it again.
  const [dismissed, setDismissed] = useState<typeof sendState>(null);
  const sent: CodeSent | null = sendState?.ok && sendState !== dismissed ? sendState.data : null;
  // Controlled, so the number survives React's form reset when the server rejects it.
  const [phoneInput, setPhoneInput] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sendState?.ok) codeRef.current?.focus();
    else if (sendState) phoneRef.current?.focus();
  }, [sendState]);

  useEffect(() => {
    if (verifyState && !verifyState.ok) codeRef.current?.select();
  }, [verifyState]);

  if (!sent) {
    const error = sendState && !sendState.ok ? sendState : null;
    return (
      <form action={sendAction} className="flex flex-col gap-5">
        {error && <FormAlert kind="error">{error.error}</FormAlert>}
        <Field data-invalid={!!error?.fields?.phone}>
          <FieldLabel htmlFor="phone">Mobile number</FieldLabel>
          <Input
            ref={phoneRef}
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={32}
            placeholder="98765 43210"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            aria-invalid={!!error?.fields?.phone}
            aria-describedby={["phone-hint", error?.fields?.phone ? "phone-error" : ""].filter(Boolean).join(" ")}
          />
          <p id="phone-hint" className="text-sm text-muted-foreground">
            We will send a 6-digit code to this number. New here? Signing in creates your account.
          </p>
          <FieldMessage id="phone-error" message={error?.fields?.phone} />
        </Field>
        <Button type="submit" size="lg" disabled={sending} className="w-full sm:w-fit">
          {sending ? "Sending…" : "Send code"}
        </Button>
      </form>
    );
  }

  const error = verifyState && !verifyState.ok ? verifyState : null;
  return (
    <div className="flex flex-col gap-5">
      <FormAlert kind="success">We sent a 6-digit code to {sent.masked}. It works for 5 minutes.</FormAlert>
      <form action={verifyAction} className="flex flex-col gap-5">
        <input type="hidden" name="phone" value={sent.phone} />
        <input type="hidden" name="next" value={next} />
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="code">6-digit code</FieldLabel>
          <Input
            ref={codeRef}
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            className="w-40 text-lg tracking-[0.3em]"
            aria-invalid={!!error}
            aria-describedby={error ? "code-error" : undefined}
          />
          <FieldMessage id="code-error" message={error?.fields?.code ?? error?.error} />
        </Field>
        <Button type="submit" size="lg" disabled={verifying} className="w-full sm:w-fit">
          {verifying ? "Checking…" : "Sign in"}
        </Button>
      </form>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <form action={sendAction}>
          <input type="hidden" name="phone" value={sent.phone} />
          <button type="submit" disabled={sending} className="font-medium text-primary underline">
            Send a new code
          </button>
        </form>
        <button type="button" onClick={() => setDismissed(sendState)} className="font-medium text-primary underline">
          Use a different number
        </button>
      </div>
    </div>
  );
}
