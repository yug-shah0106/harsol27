"use server";

import { revalidatePath } from "next/cache";
import { requireMember, SELLER_HOME_PATH } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { sendForApproval, updateSellerProfile } from "@/server/sellers";

export async function saveProfileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("updateSellerProfile", async () => {
    await updateSellerProfile(await requireMember(SELLER_HOME_PATH), formData);
    return { ok: true, data: undefined };
  });
}

/** The one step that puts company details and products before the team, together. */
export async function sendForApprovalAction(): Promise<ActionResult> {
  return runAction("sendForApproval", async () => {
    await sendForApproval(await requireMember(SELLER_HOME_PATH));
    revalidatePath(SELLER_HOME_PATH);
    revalidatePath("/seller/products");
    return { ok: true, data: undefined };
  });
}
