"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { changeLeadStatus, decideLead, leadsStamp, updateLeadSubscription } from "@/server/leads";
import { createLeadLogin, resetMemberPassword } from "@/server/member-logins";

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

/** Pending, Approved or Rejected for a registration, or for its payment (`subject`), from the list or a lead's page. */
export async function decideLeadAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("decideLead", async () => {
    const actor = await requireAdmin();
    const leadId = String(formData.get("leadId") ?? "");
    await decideLead({ leadId, decision: formData.get("decision"), subject: formData.get("subject") ?? undefined }, actor);
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/subscriptions");
    return { ok: true, data: undefined };
  });
}

/** The subscription's start, tenure and end, set by hand on a lead's page. */
export async function updateLeadSubscriptionAction(_prev: ActionResult<string> | null, formData: FormData): Promise<ActionResult<string>> {
  return runAction("updateLeadSubscription", async () => {
    const actor = await requireAdmin();
    const leadId = String(formData.get("leadId") ?? "");
    await updateLeadSubscription({ leadId, from: formData.get("from"), months: formData.get("months"), until: formData.get("until") }, actor);
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/subscriptions");
    return { ok: true, data: "Subscription saved." };
  });
}

/** Makes the member login for an approved registration (or links the person's own account); the lead page then shows it. */
export async function createLeadLoginAction(_prev: ActionResult<boolean> | null, formData: FormData): Promise<ActionResult<boolean>> {
  return runAction("createLeadLogin", async () => {
    const actor = await requireAdmin();
    const leadId = String(formData.get("leadId") ?? "");
    const { linked } = await createLeadLogin({ leadId, username: formData.get("username") }, actor);
    revalidatePath(`/admin/leads/${leadId}`);
    return { ok: true, data: linked };
  });
}

/** A new password for a seller who forgot theirs; the lead page then shows it. */
export async function resetLeadPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("resetLeadPassword", async () => {
    const actor = await requireAdmin();
    const leadId = String(formData.get("leadId") ?? "");
    await resetMemberPassword({ leadId }, actor);
    revalidatePath(`/admin/leads/${leadId}`);
    return { ok: true, data: undefined };
  });
}

/** Polled by the overview and the leads list, so a new registration shows without a reload. */
export async function leadsStampAction(): Promise<string> {
  await requireStaff();
  return leadsStamp();
}
