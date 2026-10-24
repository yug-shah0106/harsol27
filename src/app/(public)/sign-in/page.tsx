import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { safeReturnPath } from "@/lib/return-path";
import { getMember } from "@/server/authz";
import { getMessages } from "@/server/locale";
import { SignInForm } from "./forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

// Members sign in with the username and password the team gave them once their Seller registration was
// approved: there is no "Create an account", Google sign-in or self-service reset (client, 2026-10-19).
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  if (await getMember()) redirect(next);
  const { signIn: s } = await getMessages();

  return (
    <AuthCard
      title={s.title}
      description={s.description}
      footer={
        <>
          {s.noLogin}
          <Link href="/Seller-Registration" className="font-semibold text-primary hover:underline">
            {s.registerLink}
          </Link>
          {s.noLoginAfter}
        </>
      }
    >
      <SignInForm next={next} />
    </AuthCard>
  );
}
