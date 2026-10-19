"use client";

import { useActionState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyButton } from "@/components/copy-button";
import { FieldMessage, FormAlert } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLeadLoginAction, resetLeadPasswordAction } from "../actions";

type Login = { username: string | null; disabledAt: Date | null } | null;

/**
 * The registration's member login. Admins make it once the registration is approved: they choose the
 * username and a password is generated. Both stay here for admins (client, 2026-10-19), with a Copy button
 * for WhatsApp. A seller who forgets the password can't reset it themselves: an admin makes a new one here.
 * Viewers see the username only (`password` is null for them).
 */
export function LeadLogin({
  leadId,
  firstName,
  approved,
  login,
  password,
  suggestion,
  canCreate,
}: {
  leadId: string;
  firstName: string;
  approved: boolean;
  login: Login;
  password: string | null;
  suggestion: string;
  canCreate: boolean;
}) {
  const [state, action, pending] = useActionState(createLeadLoginAction, null);
  const [reset, resetAction] = useActionState(resetLeadPasswordAction, null);

  if (login?.username) {
    const { username } = login;
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        {state?.ok && <FormAlert kind="success">Login made. Send these to {firstName} on WhatsApp.</FormAlert>}
        {reset?.ok && <FormAlert kind="success">Password reset. Send the new one to {firstName} on WhatsApp.</FormAlert>}
        {reset && !reset.ok && <FormAlert kind="error">{reset.error}</FormAlert>}
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">Username</dt>
          <dd className="font-mono font-semibold">{username}</dd>
          {canCreate && (
            <>
              <dt className="text-muted-foreground">Password</dt>
              <dd className={password ? "font-mono font-semibold" : "text-muted-foreground"}>
                {password ?? "Not saved (made before passwords were kept). Reset it to make a new one."}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">Status</dt>
          <dd>{login.disabledAt ? "Switched off: the registration is not approved" : "Active"}</dd>
        </dl>
        {canCreate && (
          <div className="flex flex-wrap items-center gap-2">
            {password && <CopyButton value={`Harsol27 sign-in\nUsername: ${username}\nPassword: ${password}`} what="username and password" />}
            {!login.disabledAt && (
              <form action={resetAction}>
                <input type="hidden" name="leadId" value={leadId} />
                <ConfirmButton
                  variant="outline"
                  title="Reset this seller's password?"
                  description={`Their current password stops working and they are signed out everywhere. Then send the new one to ${firstName}.`}
                >
                  Reset password
                </ConfirmButton>
              </form>
            )}
          </div>
        )}
      </div>
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
