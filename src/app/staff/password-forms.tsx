"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/form-feedback";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { forgotPasswordAction, resetPasswordAction } from "./password-actions";

// The staff sign-in page's look: the site's own fields, the error in a red box, one kumkum button.

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, null);
  if (state?.ok) {
    return (
      <FormAlert kind="success">
        If a staff account uses {state.data.email}, we have emailed it a link to choose a new password. The link works for 1 hour. If it has
        not arrived in a few minutes, check your spam folder.
      </FormAlert>
    );
  }
  const error = state && !state.ok ? (state.fields?.email ?? state.error) : null;
  return (
    <form action={formAction} className="flex flex-col gap-5" aria-describedby={error ? "forgot-error" : undefined}>
      {error && (
        <FormAlert kind="error" id="forgot-error">
          {error}
        </FormAlert>
      )}
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="Enter your staff email" className="h-12" />
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token, minPassword }: { token: string; minPassword: number }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, null);
  const error = state && !state.ok ? (state.fields?.password ?? state.error) : null;
  return (
    <form action={formAction} className="flex flex-col gap-5" aria-describedby={error ? "reset-error" : undefined}>
      {error && (
        <FormAlert kind="error" id="reset-error">
          {error}{" "}
          {!state?.ok && !state?.fields && (
            <Link href="/staff/forgot-password" className="underline">
              Ask for a new link
            </Link>
          )}
        </FormAlert>
      )}
      <input type="hidden" name="token" value={token} />
      <Field>
        <FieldLabel htmlFor="password">New password</FieldLabel>
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={minPassword} maxLength={128} aria-describedby="password-hint" className="h-12" />
        <p id="password-hint" className="text-sm text-muted-foreground">
          At least {minPassword} characters.
        </p>
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
