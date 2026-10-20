import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "../password-forms";

export const metadata: Metadata = { title: "Forgot password · Staff · Harsol27", robots: { index: false } };

/** Staff only: members cannot reset their own password (the team gives them a new one). */
export default function StaffForgotPasswordPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-display text-4xl tracking-tight text-primary">Forgot password</h1>
          <p className="text-sm text-muted-foreground">Enter your staff email. We will email you a link to choose a new password.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/10">
          <ForgotPasswordForm />
        </div>
        <Link href="/staff/sign-in" className="text-center text-sm font-semibold text-primary hover:underline">
          Back to staff sign in
        </Link>
      </main>
    </>
  );
}
