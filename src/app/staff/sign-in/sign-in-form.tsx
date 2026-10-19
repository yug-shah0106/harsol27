"use client";

import { useActionState } from "react";
import { PasswordInput } from "@/components/password-input";
import { signInAction } from "./actions";

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, null);
  const error = state && !state.ok ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate={false} aria-describedby={error ? "sign-in-error" : undefined}>
      {error && (
        <p id="sign-in-error" role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <span className="font-semibold">Sign-in failed: </span>
          {error}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          className="rounded-lg border border-input bg-card px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={128}
          className="rounded-lg border border-input bg-card px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_85%,black)] disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
