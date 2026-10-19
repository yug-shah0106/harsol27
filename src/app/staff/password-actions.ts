"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { runAction, type ActionResult } from "@/server/errors";
import { requestStaffPasswordReset, resetStaffPassword } from "@/server/staff-password";

// Staff only: a forgotten password, by an emailed link (members ask the team instead).

export async function forgotPasswordAction(_prev: ActionResult<{ email: string }> | null, formData: FormData): Promise<ActionResult<{ email: string }>> {
  return runAction("staffForgotPassword", async () => {
    await requestStaffPasswordReset(formData.get("email"), await headers());
    return { ok: true, data: { email: String(formData.get("email") ?? "").trim() } };
  });
}

export async function resetPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAction("staffResetPassword", async () => {
    await resetStaffPassword(formData.get("token"), formData.get("password"), await headers());
    return { ok: true, data: undefined };
  });
  if (result.ok) redirect("/staff/sign-in?reset=1");
  return result;
}
