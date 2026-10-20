import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormAlert } from "@/components/form-feedback";
import { getStaff } from "@/server/authz";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Staff sign in · Harsol27", robots: { index: false } };

export default async function StaffSignInPage({ searchParams }: PageProps<"/staff/sign-in">) {
  if (await getStaff()) redirect("/admin");
  const { reset } = await searchParams;

  return (
    <>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-display text-4xl tracking-tight text-primary">Staff sign in</h1>
          <p className="text-sm text-muted-foreground">Admins login.</p>
        </div>
        {reset === "1" && (
          <FormAlert kind="success">Your password has been changed. Sign in with your new password.</FormAlert>
        )}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/10">
          <SignInForm />
        </div>
        <Link href="/staff/forgot-password" className="text-center text-sm font-semibold text-primary hover:underline">
          Forgot password?
        </Link>
      </main>
    </>
  );
}
