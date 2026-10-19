"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { changeLeadStatus, decideLead } from "@/server/leads";
import { createLeadLogin } from "@/server/member-logins";

export async function changeLeadStatusAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("changeLeadStatus", async () => {
    const actor = await requireAdmin();
    const leadId = String(formData.get("leadId") ?? "");
    await changeLeadStatus(
      { leadId, status: formData.get("status"), note: String(formData.get("note") ?? "") || undefined },
      actor,
    );
    revalidatePath(`/admin/leads/${leadId}`);
    return { ok: true, data: undefined };
  });
}

/** Approve or Reject, from the leads list or a lead's page. */
export async function decideLeadAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("decideLead", async () => {
    const actor = await requireAdmin();
    const leadId = String(formData.get("leadId") ?? "");
    await decideLead({ leadId, decision: formData.get("decision") }, actor);
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${leadId}`);
    return { ok: true, data: undefined };
  });
}

/** Makes the member login for an approved registration; the password comes back once, to send on WhatsApp. */
export async function createLeadLoginAction(_prev: ActionResult<{ username: string; password: string }> | null, formData: FormData): Promise<ActionResult<{ username: string; password: string }>> {
  return runAction("createLeadLogin", async () => {
    const actor = await requireAdmin();
    const leadId = String(formData.get("leadId") ?? "");
    const login = await createLeadLogin({ leadId, username: formData.get("username") }, actor);
    revalidatePath(`/admin/leads/${leadId}`);
    return { ok: true, data: login };
  });
}
