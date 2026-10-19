import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Toran } from "@/components/festive";
import { Wordmark } from "@/components/site-header";
import { getStaff } from "@/server/authz";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Staff sign in · Harsol27", robots: { index: false } };

export default async function StaffSignInPage({ searchParams }: PageProps<"/staff/sign-in">) {
  if (await getStaff()) redirect("/admin");
  const { reset } = await searchParams;

  return (
    <>
      <Toran />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Wordmark />
          <h1 className="font-display text-4xl tracking-tight text-primary">Staff sign in</h1>
          <p className="text-sm text-muted-foreground">For the Harsol27 team.</p>
        </div>
        {reset === "1" && (
          <p role="status" className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
            Your password has been changed. Sign in with your new password.
          </p>
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
