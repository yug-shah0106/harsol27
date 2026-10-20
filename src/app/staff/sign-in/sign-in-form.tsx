"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/form-feedback";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signInAction } from "./actions";

/** The site's own fields and button (like the seller sign-in), so both fields look the same in either theme. */
export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, null);
  const error = state && !state.ok ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-5" aria-describedby={error ? "sign-in-error" : undefined}>
      {error && (
        <FormAlert kind="error" id="sign-in-error">
          <span className="font-semibold">Sign-in failed: </span>
          {error}
        </FormAlert>
      )}
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="Enter your staff email" className="h-12" />
      </Field>
      <Field>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <PasswordInput id="password" name="password" autoComplete="current-password" required maxLength={128} placeholder="Enter your password" className="h-12" />
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
