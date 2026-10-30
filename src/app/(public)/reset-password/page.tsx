import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { getMessages } from "@/server/locale";
import { MEMBER_PASSWORD_MIN_LENGTH } from "@/server/password";
import { ResetPasswordForm } from "../sign-in/forms";

// No referrer: the token is in the address.
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" };

/** Opened from the reset email: /reset-password?token=… (the link works once, for an hour). */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const { forgotPassword: s } = await getMessages();
  return (
    <AuthCard title={s.resetTitle}>
      {typeof token === "string" && token ? (
        <ResetPasswordForm token={token} minPassword={MEMBER_PASSWORD_MIN_LENGTH} />
      ) : (
        <p role="alert">
          {s.incomplete}
          <Link href="/forgot-password" className="font-semibold text-primary underline">
            {s.askNew}
          </Link>
          .
        </p>
      )}
    </AuthCard>
  );
}
