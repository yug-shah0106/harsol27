"use server";

import { redirect } from "next/navigation";
import { requireMember, SELLER_HOME_PATH } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { createDocumentUpload, saveCompanyDetails } from "@/server/sellers";

export type UploadTicket = { key: string; uploadUrl: string };

const VERIFICATION_PATH = "/seller/companyverification";

/** Step 1 of an upload. The browser then PUTs the file straight to storage with the returned URL. */
export async function createUploadAction(input: {
  kind: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}): Promise<ActionResult<UploadTicket>> {
  return runAction("createDocumentUpload", async () => {
    const member = await requireMember(VERIFICATION_PATH);
    return { ok: true, data: await createDocumentUpload(member, input) };
  });
}

/** Saved as a draft; the dashboard then shows what is left before sending it for approval, with the products. */
export async function saveCompanyDetailsAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAction("saveCompanyDetails", async () => {
    await saveCompanyDetails(await requireMember(VERIFICATION_PATH), formData);
    return { ok: true, data: undefined };
  });
  if (result.ok) redirect(SELLER_HOME_PATH);
  return result;
}
