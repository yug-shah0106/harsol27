import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard, GoogleButton, OrDivider } from "@/components/auth-card";
import { FormAlert } from "@/components/form-feedback";
import { safeReturnPath } from "@/lib/return-path";
import { googleSignInEnabled } from "@/server/auth";
import { getMember } from "@/server/authz";
import { SignInForm } from "./forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

// Better Auth sends people back here with ?error=<code> when Google sign-in does not complete.
const GOOGLE_ERRORS: Record<string, string> = {
  account_not_linked: "This email already has a Harsol27 account. Sign in with your email and password.",
};

// Sign-in by SMS code is switched off until an SMS provider is connected (phone-sign-in.tsx, docs/FUTURE.md).
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  if (await getMember()) redirect(next);
  const google = googleSignInEnabled();
  const googleError = typeof params.error === "string" ? (GOOGLE_ERRORS[params.error] ?? "Signing in with Google did not work. Please try again.") : null;
  const query = params.next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <AuthCard
      title="Sign in"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href={`/sign-up${query}`} className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {params.reset === "1" && <FormAlert kind="success">Your password has been changed. Sign in with your new password.</FormAlert>}
      {googleError && <FormAlert kind="error">{googleError}</FormAlert>}
      <SignInForm next={next} />
      {google && (
        <>
          <OrDivider />
          <GoogleButton next={next} />
        </>
      )}
    </AuthCard>
  );
}
