import { ActionForm, SubmitButton } from "@/components/action-form";
import { sendForApprovalAction } from "./actions";

/** Sends the company details and products to the team, together. Only shown once both are there. */
export function SendForApproval({ label }: { label: string }) {
  return (
    <ActionForm action={sendForApprovalAction} className="flex flex-col items-start gap-2">
      <SubmitButton className="rounded-full">{label}</SubmitButton>
    </ActionForm>
  );
}
