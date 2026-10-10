import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SELLER_STATUS_LABELS } from "@/lib/seller-status";
import { requireMember } from "@/server/authz";
import { db } from "@/server/db";
import { memberSignOutAction } from "./actions";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountPage() {
  const member = await requireMember("/account");
  const seller = await db().seller.findUnique({ where: { userId: member.id }, select: { companyName: true, status: true } });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Your account</h1>
        <p className="text-muted-foreground">Signed in as {member.email ?? member.phone}</p>
        <p className="text-muted-foreground">
          Mobile number for sellers: {member.phone} ·{" "}
          <Link href={`/account/mobile?change=1&next=${encodeURIComponent("/account")}`} className="font-medium text-primary underline">
            Change
          </Link>
        </p>
      </div>

      <section aria-labelledby="buying-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <h2 id="buying-heading" className="text-lg font-semibold">
          Buying
        </h2>
        <p className="text-muted-foreground">Sellers you have contacted, with their phone numbers and emails.</p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/account/inquiries">My inquiries</Link>
        </Button>
      </section>

      <section aria-labelledby="seller-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <h2 id="seller-heading" className="text-lg font-semibold">
          Selling on Harsol27
        </h2>
        {seller ? (
          <>
            <p className="flex flex-wrap items-center gap-2">
              {seller.companyName} <Badge variant="secondary">{SELLER_STATUS_LABELS[seller.status]}</Badge>
            </p>
            <Button asChild variant="outline" className="w-fit">
              <Link href="/seller">Open your seller page</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              Apply to list your products. Our team reviews every application before a seller is listed.
            </p>
            <Button asChild className="w-fit">
              <Link href="/seller/apply">Apply to become a seller</Link>
            </Button>
          </>
        )}
      </section>

      <form action={memberSignOutAction}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
