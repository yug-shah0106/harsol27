"use server";

import { headers } from "next/headers";
import { runAction, type ActionResult } from "@/server/errors";
import { submitLead } from "@/server/leads";

export async function submitLeadAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("submitLead", async () => {
    await submitLead(formData, await headers());
    return { ok: true, data: undefined };
  });
}
