"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { removeProduct, restoreProduct } from "@/server/products";

/** Remove or restore a listing. One action, so the confirmation always matches what was done. */
export async function moderateProductAction(_prev: ActionResult<string | undefined> | null, formData: FormData): Promise<ActionResult<string | undefined>> {
  return runAction("moderateProduct", async () => {
    const actor = await requireAdmin();
    const productId = String(formData.get("productId") ?? "");
    let message: string;
    if (formData.get("intent") === "restore") {
      await restoreProduct(productId, actor);
      message = "Listing restored. It is shown to buyers again (if the seller is active).";
    } else {
      await removeProduct({ productId, reason: formData.get("reason") ?? "" }, actor);
      message = "Listing removed. It is no longer shown to buyers.";
    }
    revalidatePath(`/admin/products/${productId}`);
    return { ok: true, data: message };
  });
}
