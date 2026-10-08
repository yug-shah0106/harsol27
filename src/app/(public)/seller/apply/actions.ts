"use server";

import { redirect } from "next/navigation";
import { requireMember } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { createDocumentUpload, submitApplication } from "@/server/sellers";

export type UploadTicket = { key: string; uploadUrl: string };

/** Step 1 of an upload. The browser then PUTs the file straight to storage with the returned URL. */
export async function createUploadAction(input: {
  kind: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}): Promise<ActionResult<UploadTicket>> {
  return runAction("createDocumentUpload", async () => {
    const member = await requireMember("/seller/apply");
    return { ok: true, data: await createDocumentUpload(member, input) };
  });
}

export async function submitApplicationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAction("submitApplication", async () => {
    await submitApplication(await requireMember("/seller/apply"), formData);
    return { ok: true, data: undefined };
  });
  if (result.ok) redirect("/seller");
  return result;
}
