"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FormAlert } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/server/errors";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/** A form bound to a server action that shows the action's error (or success message) beneath it. */
export function ActionForm({
  action,
  children,
  className,
  successMessage,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state && !state.ok && <FormAlert kind="error">{state.error}</FormAlert>}
      {state?.ok && successMessage && <FormAlert kind="success">{successMessage}</FormAlert>}
    </form>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
