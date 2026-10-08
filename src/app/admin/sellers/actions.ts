"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { decideSeller } from "@/server/sellers";

export async function decideSellerAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("decideSeller", async () => {
    const actor = await requireAdmin();
    const sellerId = String(formData.get("sellerId") ?? "");
    await decideSeller(
      { sellerId, decision: formData.get("decision"), reason: String(formData.get("reason") ?? "") || undefined },
      actor,
    );
    revalidatePath(`/admin/sellers/${sellerId}`);
    return { ok: true, data: undefined };
  });
}
