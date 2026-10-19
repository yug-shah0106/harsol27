"use server";

import { headers } from "next/headers";
import { runAction, type ActionResult } from "@/server/errors";
import { createPaymentUpload, submitLead } from "@/server/leads";

export async function submitLeadAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("submitLead", async () => {
    await submitLead(formData, await headers());
    return { ok: true, data: undefined };
  });
}

/** Step 1 of the payment screenshot upload. The browser then PUTs the file straight to storage. */
export async function createPaymentUploadAction(input: { fileName: string; contentType: string; sizeBytes: number }): Promise<ActionResult<{ key: string; uploadUrl: string }>> {
  return runAction("createPaymentUpload", async () => ({ ok: true, data: await createPaymentUpload(input, await headers()) }));
}
