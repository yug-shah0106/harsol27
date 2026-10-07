"use client";

import { useActionState } from "react";
import { signInAction } from "./actions";

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, null);
  const error = state && !state.ok ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate={false} aria-describedby={error ? "sign-in-error" : undefined}>
      {error && (
        <p id="sign-in-error" role="alert" className="rounded-md border border-red-700 bg-red-50 p-3 text-sm text-red-900">
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
          className="rounded-md border border-neutral-500 px-3 py-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          className="rounded-md border border-neutral-500 px-3 py-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
