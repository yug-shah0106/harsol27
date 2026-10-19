"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PasswordInput } from "@/components/password-input";
import { forgotPasswordAction, resetPasswordAction } from "./password-actions";

// The staff sign-in page's look: plain labelled fields, the error in a red box, one kumkum button.
const FIELD = "rounded-lg border border-input bg-card px-3 py-2";
const BUTTON =
  "rounded-full bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_85%,black)] disabled:opacity-60";

function Problem({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      {children}
    </p>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, null);
  if (state?.ok) {
    return (
      <p role="status" className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
        If a staff account uses {state.data.email}, we have emailed it a link to choose a new password. The link works for 1 hour. If it has
        not arrived in a few minutes, check your spam folder.
      </p>
    );
  }
  const error = state && !state.ok ? (state.fields?.email ?? state.error) : null;
  return (
    <form action={formAction} className="flex flex-col gap-4" aria-describedby={error ? "forgot-error" : undefined}>
      {error && <Problem id="forgot-error">{error}</Problem>}
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} className={FIELD} />
      </div>
      <button type="submit" disabled={pending} className={BUTTON}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token, minPassword }: { token: string; minPassword: number }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, null);
  const error = state && !state.ok ? (state.fields?.password ?? state.error) : null;
  return (
    <form action={formAction} className="flex flex-col gap-4" aria-describedby={error ? "reset-error" : undefined}>
      {error && (
        <Problem id="reset-error">
          {error}{" "}
          {!state?.ok && !state?.fields && (
            <Link href="/staff/forgot-password" className="underline">
              Ask for a new link
            </Link>
          )}
        </Problem>
      )}
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={minPassword} maxLength={128} aria-describedby="password-hint" className={FIELD} />
        <p id="password-hint" className="text-sm text-muted-foreground">
          At least {minPassword} characters.
        </p>
      </div>
      <button type="submit" disabled={pending} className={BUTTON}>
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
