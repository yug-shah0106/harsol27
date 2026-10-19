"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/return-path";
import { ADD_MOBILE_PATH, requireMember } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { saveMemberMobile } from "@/server/member-auth";
import { signInWithPassword } from "@/server/password-auth";

// Buyer and seller accounts: sign in (with the username the team gave them) and the mobile number.

export async function signInAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAction("memberSignIn", async () => {
    await signInWithPassword("member", { login: formData.get("username"), password: formData.get("password") }, await headers());
    return { ok: true, data: undefined };
  });
  if (result.ok) redirect(safeReturnPath(formData.get("next")));
  return result;
}

export async function saveMobileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAction("memberSaveMobile", async () => {
    await saveMemberMobile(await requireMember(ADD_MOBILE_PATH, { phoneOptional: true }), formData.get("mobile"));
    return { ok: true, data: undefined };
  });
  if (result.ok) redirect(safeReturnPath(formData.get("next") ?? "/account"));
  return result;
}
