"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import type { ActionResult } from "@/server/errors";
import { forgotPasswordAction, resetPasswordAction, saveMobileAction, signInAction, signUpAction } from "./actions";

/**
 * Controlled fields, so what was typed survives React's form reset when the server says no.
 * The submit button looks inactive (stone, grey text: still 5:1 contrast) until the browser's own checks pass (`group-invalid`),
 * but stays clickable: a click then shows which field is missing. No JavaScript decides it, so
 * password managers that fill fields without typing cannot leave it stuck. The colour switches without
 * animation, so it is never caught half-way at an unreadable contrast.
 */
function useValues<K extends string>(initial: Record<K, string>) {
  const [values, setValues] = useState(initial);
  const bind = (name: K) => ({ name, value: values[name], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [name]: e.target.value })) });
  return bind;
}

/** After a refused submission, move focus to the first field the server marked. */
function useFocusFirstError(state: ActionResult<unknown> | null, order: string[]) {
  useEffect(() => {
    if (!state || state.ok || !state.fields) return;
    const first = order.find((name) => state.fields?.[name]);
    if (first) document.getElementById(first)?.focus();
  }, [state, order]);
}

type AuthFieldProps = { id: string; label: string; hint?: string; error?: string } & React.ComponentProps<typeof Input>;

function AuthField({ id, label, hint, error, type, ...input }: AuthFieldProps) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const field = { id, className: "h-12", "aria-invalid": !!error, "aria-describedby": describedBy, ...input };
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {type === "password" ? <PasswordInput {...field} /> : <Input type={type} {...field} />}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldMessage id={`${id}-error`} message={error} />
    </Field>
  );
}

function Submit({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <Button type="submit" size="lg" disabled={pending} data-magnet className="w-full transition-none group-invalid:bg-secondary group-invalid:text-muted-foreground group-invalid:hover:bg-secondary">
      {pending ? pendingLabel : label}
    </Button>
  );
}

const fieldsOf = (state: ActionResult<unknown> | null) => (state && !state.ok ? (state.fields ?? {}) : {});
const formError = (state: ActionResult<unknown> | null) => (state && !state.ok && !state.fields ? state.error : null);

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAction, null);
  const bind = useValues({ email: "", password: "" });
  const error = state && !state.ok ? state.error : null;
  return (
    <form action={action} className="group flex flex-col gap-5">
      {error && <FormAlert kind="error">{error}</FormAlert>}
      <input type="hidden" name="next" value={next} />
      <AuthField id="email" label="Email" type="email" autoComplete="email" required maxLength={254} placeholder="Enter your email" {...bind("email")} />
      <div className="flex flex-col gap-3">
        <AuthField id="password" label="Password" type="password" autoComplete="current-password" required maxLength={128} placeholder="Enter your password" {...bind("password")} />
        <Link href="/forgot-password" className="self-end text-sm font-semibold hover:underline">
          Forgot password?
        </Link>
      </div>
      <Submit pending={pending} label="Continue" pendingLabel="Signing in…" />
    </form>
  );
}

// Module-level, so the focus effect runs when the result changes, not on every keystroke.
const SIGN_UP_FIELDS = ["name", "email", "mobile", "password"];
const PASSWORD_FIELD = ["password"];
const MOBILE_FIELD = ["mobile"];

export function SignUpForm({ next, minPassword }: { next: string; minPassword: number }) {
  const [state, action, pending] = useActionState(signUpAction, null);
  const bind = useValues({ name: "", email: "", mobile: "", password: "" });
  const fields = fieldsOf(state);
  const error = formError(state);
  useFocusFirstError(state, SIGN_UP_FIELDS);
  return (
    <form action={action} className="group flex flex-col gap-5">
      {error && <FormAlert kind="error">{error}</FormAlert>}
      <input type="hidden" name="next" value={next} />
      <AuthField id="name" label="Your name" autoComplete="name" required maxLength={100} placeholder="Enter your name" error={fields.name} {...bind("name")} />
      <AuthField id="email" label="Email" type="email" autoComplete="email" required maxLength={254} placeholder="Enter your email" error={fields.email} {...bind("email")} />
      <AuthField
        id="mobile"
        label="Mobile number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        maxLength={32}
        placeholder="98765 43210"
        hint="Sellers you contact get this number, so they can call you back. Indian numbers need no country code."
        error={fields.mobile}
        {...bind("mobile")}
      />
      <AuthField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        minLength={minPassword}
        maxLength={128}
        placeholder="Create a password"
        hint={`At least ${minPassword} characters.`}
        error={fields.password}
        {...bind("password")}
      />
      <Submit pending={pending} label="Create account" pendingLabel="Creating your account…" />
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null);
  const bind = useValues({ email: "" });
  const fields = fieldsOf(state);
  const error = formError(state);
  if (state?.ok) {
    return (
      <FormAlert kind="success">
        If an account uses {state.data.email}, we have emailed it a link to choose a new password. The link works for 1 hour. If it has not
        arrived in a few minutes, check your spam folder.
      </FormAlert>
    );
  }
  return (
    <form action={action} className="group flex flex-col gap-5">
      {error && <FormAlert kind="error">{error}</FormAlert>}
      <AuthField id="email" label="Email" type="email" autoComplete="email" required maxLength={254} placeholder="Enter your email" error={fields.email} {...bind("email")} />
      <Submit pending={pending} label="Send reset link" pendingLabel="Sending…" />
    </form>
  );
}

export function ResetPasswordForm({ token, minPassword }: { token: string; minPassword: number }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  const bind = useValues({ password: "" });
  const fields = fieldsOf(state);
  const error = formError(state);
  useFocusFirstError(state, PASSWORD_FIELD);
  return (
    <form action={action} className="group flex flex-col gap-5">
      {error && (
        <FormAlert kind="error">
          {error}{" "}
          <Link href="/forgot-password" className="underline">
            Ask for a new link
          </Link>
        </FormAlert>
      )}
      <input type="hidden" name="token" value={token} />
      <AuthField
        id="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        minLength={minPassword}
        maxLength={128}
        placeholder="Create a password"
        hint={`At least ${minPassword} characters.`}
        error={fields.password}
        {...bind("password")}
      />
      <Submit pending={pending} label="Set new password" pendingLabel="Saving…" />
    </form>
  );
}

export function MobileForm({ next, current }: { next: string; current: string }) {
  const [state, action, pending] = useActionState(saveMobileAction, null);
  const bind = useValues({ mobile: current });
  const fields = fieldsOf(state);
  const error = formError(state);
  useFocusFirstError(state, MOBILE_FIELD);
  return (
    <form action={action} className="group flex flex-col gap-5">
      {error && <FormAlert kind="error">{error}</FormAlert>}
      <input type="hidden" name="next" value={next} />
      <AuthField
        id="mobile"
        label="Mobile number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        maxLength={32}
        placeholder="98765 43210"
        hint="Indian numbers need no country code. For other countries, start with + and the code."
        error={fields.mobile}
        {...bind("mobile")}
      />
      <Submit pending={pending} label="Save and continue" pendingLabel="Saving…" />
    </form>
  );
}
