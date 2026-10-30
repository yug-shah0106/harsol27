"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { runAction, type ActionResult } from "@/server/errors";
import { requestPasswordReset, resetPassword } from "@/server/password-reset";

// Staff: a forgotten password, by an emailed link (members have their own pages: /forgot-password).

export async function forgotPasswordAction(_prev: ActionResult<{ email: string }> | null, formData: FormData): Promise<ActionResult<{ email: string }>> {
  return runAction("staffForgotPassword", async () => {
    await requestPasswordReset("staff", formData.get("email"), await headers());
    return { ok: true, data: { email: String(formData.get("email") ?? "").trim() } };
  });
}

export async function resetPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAction("staffResetPassword", async () => {
    await resetPassword("staff", formData.get("token"), formData.get("password"), await headers());
    return { ok: true, data: undefined };
  });
  if (result.ok) redirect("/staff/sign-in?reset=1");
  return result;
}
