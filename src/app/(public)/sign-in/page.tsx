import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { safeReturnPath } from "@/lib/return-path";
import { getMember } from "@/server/authz";
import { getMessages } from "@/server/locale";
import { SignInForm } from "./forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

// Members sign in with a username and password: buyers chose theirs (/sign-up, since 2026-10-24), sellers got
// theirs from the team once their Seller registration was approved. No Google sign-in, no self-service reset.
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  if (await getMember()) redirect(next);
  const { signIn: s } = await getMessages();
  const query = params.next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <AuthCard
      title={s.title}
      description={s.description}
      footer={
        <>
          {s.newHere}
          <Link href={`/sign-up${query}`} className="font-semibold text-primary hover:underline">
            {s.createAccount}
          </Link>
          <br />
          {s.selling}
          <Link href="/Seller-Registration" className="font-semibold text-primary hover:underline">
            {s.registerLink}
          </Link>
          {s.sellingAfter}
        </>
      }
    >
      <SignInForm next={next} />
    </AuthCard>
  );
}
