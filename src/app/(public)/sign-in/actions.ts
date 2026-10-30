"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/return-path";
import { ADD_MOBILE_PATH, requireMember, SELLER_HOME_PATH, SELLER_SIGN_IN_PATH } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import { saveMemberMobile, signUpBuyer } from "@/server/member-auth";
import { signInWithPassword } from "@/server/password-auth";
import { requestPasswordReset, resetPassword } from "@/server/password-reset";

// Buyer and seller accounts: buyers sign in with their email, sellers (/seller/sign-in) with the username the team
// gave them; a buyer's own account; a forgotten password; the mobile number.

export async function signInAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAction("buyerSignIn", async () => {
    await signInWithPassword("buyer", { login: formData.get("email"), password: formData.get("password") }, await headers());
    return { ok: true, data: undefined };
  });
  if (result.ok) redirect(safeReturnPath(formData.get("next")));
  return result;
}

/** A seller goes back where they were sent from, or else to their dashboard. */
export async function sellerSignInAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAction("sellerSignIn", async () => {
    await signInWithPassword("seller", { login: formData.get("username"), password: formData.get("password") }, await headers());
    return { ok: true, data: undefined };
  });
  if (result.ok) redirect(safeReturnPath(formData.get("next") || undefined, SELLER_HOME_PATH));
  return result;
}

export async function signUpAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAction("memberSignUp", async () => {
    await signUpBuyer(formData, await headers());
    return { ok: true, data: undefined };
  });
  if (result.ok) redirect(safeReturnPath(formData.get("next")));
  return result;
}

/** Forgot password (2026-10-30): a reset link to the email on their account, if there is one. Same reply either way. */
export async function forgotPasswordAction(_prev: ActionResult<{ email: string }> | null, formData: FormData): Promise<ActionResult<{ email: string }>> {
  return runAction("memberForgotPassword", async () => {
    await requestPasswordReset("member", formData.get("email"), await headers());
    return { ok: true, data: { email: String(formData.get("email") ?? "").trim() } };
  });
}

/** From the emailed link: a seller then signs in on the seller page, a buyer on theirs. */
export async function resetPasswordAction(_prev: ActionResult<string> | null, formData: FormData): Promise<ActionResult<string>> {
  const result = await runAction("memberResetPassword", async () => {
    const { username } = await resetPassword("member", formData.get("token"), formData.get("password"), await headers());
    return { ok: true, data: `${username ? SELLER_SIGN_IN_PATH : "/sign-in"}?reset=1` };
  });
  if (result.ok) redirect(result.data);
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
