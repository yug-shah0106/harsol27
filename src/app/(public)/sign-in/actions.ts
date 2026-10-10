"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/return-path";
import { ADD_MOBILE_PATH, requireMember } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { requestMemberPasswordReset, resetMemberPassword, saveMemberMobile, signUpMember } from "@/server/member-auth";
import { signInWithPassword } from "@/server/password-auth";

// Buyer and seller accounts: sign in, create an account, forgot/reset password, mobile number.

export async function signInAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAction("memberSignIn", async () => {
    await signInWithPassword("member", { email: formData.get("email"), password: formData.get("password") }, await headers());
    return { ok: true, data: undefined };
  });
  if (result.ok) redirect(safeReturnPath(formData.get("next")));
  return result;
}

export async function signUpAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAction("memberSignUp", async () => {
    await signUpMember(formData, await headers());
    return { ok: true, data: undefined };
  });
  if (result.ok) redirect(safeReturnPath(formData.get("next")));
  return result;
}

export async function forgotPasswordAction(_prev: ActionResult<{ email: string }> | null, formData: FormData): Promise<ActionResult<{ email: string }>> {
  return runAction("memberForgotPassword", async () => {
    await requestMemberPasswordReset(formData.get("email"), await headers());
    return { ok: true, data: { email: String(formData.get("email") ?? "").trim() } };
  });
}

export async function resetPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAction("memberResetPassword", async () => {
    await resetMemberPassword(formData.get("token"), formData.get("password"), await headers());
    return { ok: true, data: undefined };
  });
  if (result.ok) redirect("/sign-in?reset=1");
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
