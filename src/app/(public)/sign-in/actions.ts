"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/return-path";
import { runAction, type ActionResult } from "@/server/errors";
import { maskPhone, requestOtp, verifyOtpAndSignIn } from "@/server/member-auth";

export type CodeSent = { phone: string; masked: string };

export async function requestOtpAction(_prev: ActionResult<CodeSent> | null, formData: FormData): Promise<ActionResult<CodeSent>> {
  return runAction("requestOtp", async () => {
    const { phone } = await requestOtp(formData.get("phone"), await headers());
    return { ok: true, data: { phone, masked: maskPhone(phone) } };
  });
}

export async function verifyOtpAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAction("verifyOtp", async () => {
    await verifyOtpAndSignIn(formData.get("phone"), formData.get("code"), await headers());
    return { ok: true, data: undefined };
  });
  if (result.ok) redirect(safeReturnPath(formData.get("next")));
  return result;
}
