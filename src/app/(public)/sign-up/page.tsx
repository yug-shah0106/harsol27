import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard, GoogleButton, OrDivider } from "@/components/auth-card";
import { safeReturnPath } from "@/lib/return-path";
import { googleSignInEnabled } from "@/server/auth";
import { getMember } from "@/server/authz";
import { MEMBER_PASSWORD_MIN_LENGTH } from "@/server/password";
import { SignUpForm } from "../sign-in/forms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  if (await getMember()) redirect(next);
  const query = params.next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <AuthCard
      title="Create an account"
      description="For buyers and sellers. Sellers apply from their account after signing up."
      footer={
        <>
          Already have an account?{" "}
          <Link href={`/sign-in${query}`} className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm next={next} minPassword={MEMBER_PASSWORD_MIN_LENGTH} />
      {googleSignInEnabled() && (
        <>
          <OrDivider />
          <GoogleButton next={next} />
        </>
      )}
    </AuthCard>
  );
}
