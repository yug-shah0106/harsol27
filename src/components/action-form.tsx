"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FormAlert } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/server/errors";


/**
 * A form bound to a server action that shows the action's error, or its success message, beneath it.
 * An action may return its own message as `data` (when one form can do different things).
 */
export function ActionForm<T extends string | undefined>({
  action,
  children,
  className,
  successMessage,
}: {
  action: (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state && !state.ok && <FormAlert kind="error">{state.error}</FormAlert>}
      {state?.ok && (state.data ?? successMessage) && <FormAlert kind="success">{state.data ?? successMessage}</FormAlert>}
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
