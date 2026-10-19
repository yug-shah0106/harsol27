import type { Metadata } from "next";
import Link from "next/link";
import { Toran } from "@/components/festive";
import { Wordmark } from "@/components/site-header";
import { STAFF_PASSWORD_MIN_LENGTH } from "@/server/password";
import { ResetPasswordForm } from "../password-forms";

export const metadata: Metadata = { title: "Choose a new password · Staff · Harsol27", robots: { index: false }, referrer: "no-referrer" };

/** Opened from the reset email: /staff/reset-password?token=… (the link works once, for an hour). */
export default async function StaffResetPasswordPage({ searchParams }: PageProps<"/staff/reset-password">) {
  const { token } = await searchParams;
  return (
    <>
      <Toran />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Wordmark />
          <h1 className="font-display text-4xl tracking-tight text-primary">Choose a new password</h1>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/10">
          {typeof token === "string" && token ? (
            <ResetPasswordForm token={token} minPassword={STAFF_PASSWORD_MIN_LENGTH} />
          ) : (
            <p role="alert" className="text-sm">
              This link is incomplete. Open the link from the email again, or{" "}
              <Link href="/staff/forgot-password" className="font-semibold text-primary underline">
                ask for a new one
              </Link>
              .
            </p>
          )}
        </div>
        <Link href="/staff/sign-in" className="text-center text-sm font-semibold text-primary hover:underline">
          Back to staff sign in
        </Link>
      </main>
    </>
  );
}
