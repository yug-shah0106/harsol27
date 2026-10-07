import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff } from "@/server/authz";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Staff sign in · Harsol27", robots: { index: false } };

export default async function StaffSignInPage() {
  if (await getStaff()) redirect("/admin");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Staff sign in</h1>
      <SignInForm />
    </main>
  );
}
