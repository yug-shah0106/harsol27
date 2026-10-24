import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { safeReturnPath } from "@/lib/return-path";
import { getMember } from "@/server/authz";
import { getMessages } from "@/server/locale";
import { MEMBER_PASSWORD_MIN_LENGTH } from "@/server/password";
import { SignUpForm } from "../sign-in/forms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

// Buyers make their own account, to send inquiries and see sellers' contact details (client, 2026-10-24).
// Sellers register their business instead; the team gives them their login.
export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  if (await getMember()) redirect(next);
  const { signUp: s } = await getMessages();
  const query = params.next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <AuthCard
      title={s.title}
      description={s.description}
      footer={
        <>
          {s.haveAccount}
          <Link href={`/sign-in${query}`} className="font-semibold text-primary hover:underline">
            {s.signIn}
          </Link>
          <br />
          {s.selling}
          <Link href="/Seller-Registration" className="font-semibold text-primary hover:underline">
            {s.registerBusiness}
          </Link>
        </>
      }
    >
      <SignUpForm next={next} minPassword={MEMBER_PASSWORD_MIN_LENGTH} />
    </AuthCard>
  );
}
