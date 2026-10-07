"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { runAction, type ActionResult } from "@/server/errors";
import { signInStaff } from "@/server/staff-auth";

export async function signInAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAction("staffSignIn", async () => {
    await signInStaff({ email: formData.get("email"), password: formData.get("password") }, await headers());
    return { ok: true, data: undefined };
  });
  if (result.ok) redirect("/admin");
  return result;
}
