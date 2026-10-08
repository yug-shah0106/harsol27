"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { formatDay } from "@/lib/subscription";
import { decideSeller } from "@/server/sellers";
import { recordPayment } from "@/server/subscriptions";

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

export async function recordPaymentAction(_prev: ActionResult<string> | null, formData: FormData): Promise<ActionResult<string>> {
  return runAction("recordPayment", async () => {
    const actor = await requireAdmin();
    const sellerId = String(formData.get("sellerId") ?? "");
    const paidUntil = await recordPayment(Object.fromEntries(formData), actor); // unknown fields are ignored
    revalidatePath(`/admin/sellers/${sellerId}`);
    return { ok: true, data: `Payment recorded. Paid until ${formatDay(paidUntil)}.` };
  });
}
