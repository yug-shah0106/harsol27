"use client";

import { useActionState } from "react";
import { CopyButton } from "@/components/copy-button";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLeadLoginAction } from "../actions";

type Login = { username: string | null; disabledAt: Date | null } | null;

/**
 * The registration's member login. Admins make it once the registration is approved: they choose the
 * username, the password is generated and shown here once, to copy and send on WhatsApp.
 */
export function LeadLogin({ leadId, firstName, approved, login, suggestion, canCreate }: { leadId: string; firstName: string; approved: boolean; login: Login; suggestion: string; canCreate: boolean }) {
  const [state, action, pending] = useActionState(createLeadLoginAction, null);

  // Just made: the only time the password is ever shown.
  if (state?.ok) {
    const { username, password } = state.data;
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-success/40 bg-success/10 p-4">
        <p className="font-semibold">Login made. Send these to {firstName} on WhatsApp:</p>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">Username</dt>
          <dd className="font-mono font-semibold">{username}</dd>
          <dt className="text-muted-foreground">Password</dt>
          <dd className="font-mono font-semibold">{password}</dd>
        </dl>
        <div className="flex flex-wrap items-center gap-3">
          <CopyButton value={`Harsol27 sign-in\nUsername: ${username}\nPassword: ${password}`} what="username and password" />
          <p className="text-sm text-muted-foreground">The password is shown only now. It is not stored where anyone can read it.</p>
        </div>
      </div>
    );
  }

  if (login?.username) {
    return (
      <p className="flex flex-wrap items-center gap-2">
        Username <span className="font-mono font-semibold">{login.username}</span>
        <span className="text-sm text-muted-foreground">· {login.disabledAt ? "switched off: the registration is not approved" : "active"}</span>
      </p>
    );
  }
  if (!approved) return <p className="text-muted-foreground">A login can be made once the registration is approved.</p>;
  if (!canCreate) return <p className="text-muted-foreground">No login yet.</p>;

  const fieldError = state && !state.ok ? state.fields?.username : undefined;
  const formError = state && !state.ok && !state.fields ? state.error : undefined;
  return (
    <form action={action} className="flex flex-col gap-3">
      {formError && <FormAlert kind="error">{formError}</FormAlert>}
      <input type="hidden" name="leadId" value={leadId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="username">Username</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="username"
            name="username"
            defaultValue={suggestion}
            required
            maxLength={30}
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!fieldError}
            aria-describedby={["username-hint", fieldError ? "username-error" : ""].filter(Boolean).join(" ")}
            className="max-w-xs font-mono"
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Making the login…" : "Create login"}
          </Button>
        </div>
        <p id="username-hint" className="text-sm text-muted-foreground">
          3 to 30 letters, numbers, dots or underscores. A password is made for you.
        </p>
        <FieldMessage id="username-error" message={fieldError} />
      </div>
    </form>
  );
}
