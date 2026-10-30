"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { useI18n } from "@/components/i18n";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { fill, translateError } from "@/lib/i18n";
import type { ActionResult } from "@/server/errors";
import { forgotPasswordAction, resetPasswordAction, saveMobileAction, sellerSignInAction, signInAction, signUpAction } from "./actions";

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
    <Button type="submit" size="lg" disabled={pending} className="w-full transition-none group-invalid:bg-secondary group-invalid:text-muted-foreground group-invalid:hover:bg-secondary">
      {pending ? pendingLabel : label}
    </Button>
  );
}

const fieldsOf = (state: ActionResult<unknown> | null) => (state && !state.ok ? (state.fields ?? {}) : {});
const formError = (state: ActionResult<unknown> | null) => (state && !state.ok && !state.fields ? state.error : null);

/** Under the password, on both sign-in pages (2026-10-30: members reset their own, by an emailed link). */
function ForgotLink({ label }: { label: string }) {
  return (
    <Link href="/forgot-password" className="w-fit text-sm font-semibold text-primary hover:underline">
      {label}
    </Link>
  );
}

/** Buyers: the email and password they signed up with. */
export function SignInForm({ next }: { next: string }) {
  const { t } = useI18n();
  const s = t.signIn;
  const [state, action, pending] = useActionState(signInAction, null);
  const bind = useValues({ email: "", password: "" });
  const error = state && !state.ok ? translateError(t, state.error) : null;
  return (
    <form action={action} className="group flex flex-col gap-5">
      {error && <FormAlert kind="error">{error}</FormAlert>}
      <input type="hidden" name="next" value={next} />
      <AuthField id="email" label={s.email} type="email" autoComplete="email" required maxLength={254} placeholder={s.emailPlaceholder} {...bind("email")} />
      <div className="flex flex-col gap-2">
        <AuthField id="password" label={s.password} type="password" autoComplete="current-password" required maxLength={128} placeholder={s.passwordPlaceholder} {...bind("password")} />
        <ForgotLink label={s.forgotLink} />
      </div>
      <Submit pending={pending} label={s.submit} pendingLabel={s.submitting} />
    </form>
  );
}

/** Sellers: the username and password the team sent them. */
export function SellerSignInForm({ next }: { next: string }) {
  const { t } = useI18n();
  const s = t.signIn;
  const [state, action, pending] = useActionState(sellerSignInAction, null);
  const bind = useValues({ username: "", password: "" });
  const error = state && !state.ok ? translateError(t, state.error) : null;
  return (
    <form action={action} className="group flex flex-col gap-5">
      {error && <FormAlert kind="error">{error}</FormAlert>}
      <input type="hidden" name="next" value={next} />
      <AuthField id="username" label={t.sellerSignIn.username} autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={30} placeholder={t.sellerSignIn.usernamePlaceholder} {...bind("username")} />
      <div className="flex flex-col gap-2">
        <AuthField id="password" label={s.password} type="password" autoComplete="current-password" required maxLength={128} placeholder={s.passwordPlaceholder} {...bind("password")} />
        <ForgotLink label={s.forgotLink} />
      </div>
      <Submit pending={pending} label={s.submit} pendingLabel={s.submitting} />
    </form>
  );
}

// Module-level, so the focus effect runs when the result changes, not on every keystroke.
const SIGN_UP_FIELDS = ["name", "mobile", "email", "password"];

/** A buyer's own account (sellers get theirs from the team): they sign in with its email. Signed in at once. */
export function SignUpForm({ next, minPassword }: { next: string; minPassword: number }) {
  const { t } = useI18n();
  const s = t.signUp;
  const [state, action, pending] = useActionState(signUpAction, null);
  const bind = useValues({ name: "", mobile: "", email: "", password: "" });
  const fields = fieldsOf(state);
  const error = formError(state);
  const fieldError = (name: string) => fields[name] && translateError(t, fields[name]);
  useFocusFirstError(state, SIGN_UP_FIELDS);
  return (
    <form action={action} className="group flex flex-col gap-5">
      {error && <FormAlert kind="error">{translateError(t, error)}</FormAlert>}
      <input type="hidden" name="next" value={next} />
      <AuthField id="name" label={s.name} autoComplete="name" required maxLength={100} error={fieldError("name")} {...bind("name")} />
      <AuthField id="mobile" label={s.mobile} type="tel" inputMode="tel" autoComplete="tel" required maxLength={32} placeholder="98765 43210" hint={s.mobileHint} error={fieldError("mobile")} {...bind("mobile")} />
      <AuthField id="email" label={s.email} type="email" autoComplete="email" required maxLength={254} hint={s.emailHint} error={fieldError("email")} {...bind("email")} />
      <AuthField id="password" label={s.password} type="password" autoComplete="new-password" required minLength={minPassword} maxLength={128} hint={fill(s.passwordHint, { min: minPassword })} error={fieldError("password")} {...bind("password")} />
      <Submit pending={pending} label={s.submit} pendingLabel={s.submitting} />
    </form>
  );
}

const MOBILE_FIELD = ["mobile"];

export function MobileForm({ next, current }: { next: string; current: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(saveMobileAction, null);
  const bind = useValues({ mobile: current });
  const fields = fieldsOf(state);
  const error = formError(state);
  useFocusFirstError(state, MOBILE_FIELD);
  return (
    <form action={action} className="group flex flex-col gap-5">
      {error && <FormAlert kind="error">{translateError(t, error)}</FormAlert>}
      <input type="hidden" name="next" value={next} />
      <AuthField
        id="mobile"
        label={t.mobile.label}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        maxLength={32}
        placeholder="98765 43210"
        hint={t.registration.phoneHint}
        error={fields.mobile && translateError(t, fields.mobile)}
        {...bind("mobile")}
      />
      <Submit pending={pending} label={t.mobile.submit} pendingLabel={t.mobile.saving} />
    </form>
  );
}

/** The email on their account; a reset link goes there if there is one (the reply is the same either way). */
export function ForgotPasswordForm() {
  const { t } = useI18n();
  const s = t.forgotPassword;
  const [state, action, pending] = useActionState(forgotPasswordAction, null);
  const bind = useValues({ email: "" });
  if (state?.ok) return <FormAlert kind="success">{fill(s.sent, { email: state.data.email })}</FormAlert>;
  const fields = fieldsOf(state);
  const error = formError(state);
  return (
    <form action={action} className="group flex flex-col gap-5">
      {error && <FormAlert kind="error">{translateError(t, error)}</FormAlert>}
      <AuthField id="email" label={s.email} type="email" autoComplete="email" required maxLength={254} placeholder={s.emailPlaceholder} error={fields.email && translateError(t, fields.email)} {...bind("email")} />
      <Submit pending={pending} label={s.submit} pendingLabel={s.sending} />
    </form>
  );
}

/** From the emailed link: the new password (at least `minPassword` characters). */
export function ResetPasswordForm({ token, minPassword }: { token: string; minPassword: number }) {
  const { t } = useI18n();
  const s = t.forgotPassword;
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  const bind = useValues({ password: "" });
  const fields = fieldsOf(state);
  const error = formError(state);
  return (
    <form action={action} className="group flex flex-col gap-5">
      {error && (
        <FormAlert kind="error">
          {translateError(t, error)}{" "}
          <Link href="/forgot-password" className="underline">
            {s.askNewLink}
          </Link>
        </FormAlert>
      )}
      <input type="hidden" name="token" value={token} />
      <AuthField id="password" label={s.newPassword} type="password" autoComplete="new-password" required minLength={minPassword} maxLength={128} hint={fill(s.passwordHint, { min: minPassword })} error={fields.password && translateError(t, fields.password)} {...bind("password")} />
      <Submit pending={pending} label={s.save} pendingLabel={s.saving} />
    </form>
  );
}
