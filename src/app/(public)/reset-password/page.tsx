import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { FormAlert } from "@/components/form-feedback";
import { MEMBER_PASSWORD_MIN_LENGTH } from "@/server/password";
import { ResetPasswordForm } from "../sign-in/forms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" };

/** Opened from the reset email: /reset-password?token=… (the link works once, for an hour). */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  return (
    <AuthCard
      title="Choose a new password"
      footer={
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {typeof token === "string" && token ? (
        <ResetPasswordForm token={token} minPassword={MEMBER_PASSWORD_MIN_LENGTH} />
      ) : (
        <FormAlert kind="error">
          This link is incomplete. Open the link from the email again, or{" "}
          <Link href="/forgot-password" className="underline">
            ask for a new one
          </Link>
          .
        </FormAlert>
      )}
    </AuthCard>
  );
}
