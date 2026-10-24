"use client";

import { useActionState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { FormAlert } from "@/components/form-feedback";
import { resetMemberPasswordAction } from "./actions";

/** "Reset password" on a member's row: asks first, then the row shows the new password. */
export function ResetMemberPassword({ userId, name }: { userId: string; name: string }) {
  const [state, action] = useActionState(resetMemberPasswordAction, null);
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      {state && !state.ok && <FormAlert kind="error">{state.error}</FormAlert>}
      <input type="hidden" name="userId" value={userId} />
      <ConfirmButton
        variant="outline"
        size="sm"
        title={`Reset ${name}'s password?`}
        description={`Their current password stops working and they are signed out everywhere. Then send the new one to ${name}.`}
      >
        Reset password
      </ConfirmButton>
    </form>
  );
}
