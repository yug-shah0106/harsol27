"use server";

import { requireMember, SELLER_HOME_PATH } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { updateSellerProfile } from "@/server/sellers";

export async function saveProfileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("updateSellerProfile", async () => {
    await updateSellerProfile(await requireMember(SELLER_HOME_PATH), formData);
    return { ok: true, data: undefined };
  });
}
