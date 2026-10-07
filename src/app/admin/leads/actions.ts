"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { changeLeadStatus } from "@/server/leads";

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
