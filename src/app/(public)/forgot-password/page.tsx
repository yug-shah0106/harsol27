import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { getMessages } from "@/server/locale";
import { ForgotPasswordForm } from "../sign-in/forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

// Buyers and sellers (2026-10-30): a reset link to the email on their account. Sellers use the email from their
// Seller registration (their login's email), though they sign in with a username.
export default async function ForgotPasswordPage() {
  const { forgotPassword: s } = await getMessages();
  return (
    <AuthCard
      title={s.title}
      description={s.description}
      footer={
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          {s.back}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
