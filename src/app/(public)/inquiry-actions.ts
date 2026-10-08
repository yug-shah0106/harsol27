"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { safeReturnPath } from "@/lib/return-path";
import { requireMember } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { sendInquiry } from "@/server/inquiries";

export async function sendInquiryAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const returnTo = safeReturnPath(formData.get("returnTo"), "/");
  return runAction("sendInquiry", async () => {
    await sendInquiry(await requireMember(returnTo), formData, await headers());
    revalidatePath(returnTo); // the page re-renders with the seller's contact unlocked
    return { ok: true, data: undefined };
  });
}
