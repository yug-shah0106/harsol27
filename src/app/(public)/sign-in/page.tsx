import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { safeReturnPath } from "@/lib/return-path";
import { getMember } from "@/server/authz";
import { getMessages } from "@/server/locale";
import { SignInForm } from "./forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

// Buyers sign in here with the email and password of the account they made (/sign-up); sellers have their own
// page, /seller/sign-in, for the team's username and password (client, 2026-10-25). No Google, no self-service reset.
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
          {s.sellerLine}
          <Link href="/seller/sign-in" className="font-semibold text-primary hover:underline">
            {s.sellerLink}
          </Link>
        </>
      }
    >
      <SignInForm next={next} />
    </AuthCard>
  );
}
