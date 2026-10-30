import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { FormAlert } from "@/components/form-feedback";
import { safeReturnPath } from "@/lib/return-path";
import { getMember, SELLER_HOME_PATH } from "@/server/authz";
import { getMessages } from "@/server/locale";
import { SellerSignInForm } from "../../sign-in/forms";

export const metadata: Metadata = { title: "Seller sign in", robots: { index: false } };

// Sellers sign in here with the username and password the team gave them once their Seller registration was
// approved (client, 2026-10-25); buyers use /sign-in with their own email. Then on to their dashboard.
export default async function SellerSignInPage({ searchParams }: PageProps<"/seller/sign-in">) {
  const params = await searchParams;
  const member = await getMember();
  if (member) redirect(safeReturnPath(params.next, SELLER_HOME_PATH));
  const { sellerSignIn: s, signIn } = await getMessages();

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
          <br />
          {s.buyerLine}
          <Link href="/sign-in" className="font-semibold text-primary hover:underline">
            {s.buyerLink}
          </Link>
        </>
      }
    >
      {params.reset === "1" && <FormAlert kind="success">{signIn.resetDone}</FormAlert>}
      <SellerSignInForm next={safeReturnPath(params.next, "")} />
    </AuthCard>
  );
}
