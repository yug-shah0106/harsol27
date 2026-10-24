"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { resetMemberPassword } from "@/server/member-logins";

/** A new password for a member who forgot theirs; the Members list then shows it, to send on WhatsApp. */
export async function resetMemberPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("resetMemberPassword", async () => {
    const actor = await requireAdmin();
    await resetMemberPassword({ userId: String(formData.get("userId") ?? "") }, actor);
    revalidatePath("/admin/members");
    return { ok: true, data: undefined };
  });
}
