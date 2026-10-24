"use client";

import { useActionState, useEffect, useState } from "react";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { useI18n } from "@/components/i18n";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { fill, translateError } from "@/lib/i18n";
import type { ActionResult } from "@/server/errors";
import { saveMobileAction, signInAction, signUpAction } from "./actions";

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

export function SignInForm({ next }: { next: string }) {
  const { t } = useI18n();
  const s = t.signIn;
  const [state, action, pending] = useActionState(signInAction, null);
  const bind = useValues({ username: "", password: "" });
  const error = state && !state.ok ? translateError(t, state.error) : null;
  return (
    <form action={action} className="group flex flex-col gap-5">
      {error && <FormAlert kind="error">{error}</FormAlert>}
      <input type="hidden" name="next" value={next} />
      <AuthField id="username" label={s.username} autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={30} placeholder={s.usernamePlaceholder} {...bind("username")} />
      <div className="flex flex-col gap-2">
        <AuthField id="password" label={s.password} type="password" autoComplete="current-password" required maxLength={128} placeholder={s.passwordPlaceholder} {...bind("password")} />
        {/* No self-service reset: the team gives a new password when one is forgotten. */}
        <p className="text-sm text-muted-foreground">{s.forgot}</p>
      </div>
      <Submit pending={pending} label={s.submit} pendingLabel={s.submitting} />
    </form>
  );
}

// Module-level, so the focus effect runs when the result changes, not on every keystroke.
const SIGN_UP_FIELDS = ["name", "mobile", "email", "username", "password"];

/** A buyer's own account (sellers get theirs from the team). Signed in at once. */
export function SignUpForm({ next, minPassword }: { next: string; minPassword: number }) {
  const { t } = useI18n();
  const s = t.signUp;
  const [state, action, pending] = useActionState(signUpAction, null);
  const bind = useValues({ name: "", mobile: "", email: "", username: "", password: "" });
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
      <AuthField id="email" label={s.email} type="email" autoComplete="email" required maxLength={254} error={fieldError("email")} {...bind("email")} />
      <AuthField id="username" label={s.username} autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={30} pattern="[A-Za-z0-9][A-Za-z0-9._]{2,29}" hint={s.usernameHint} error={fieldError("username")} {...bind("username")} />
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
