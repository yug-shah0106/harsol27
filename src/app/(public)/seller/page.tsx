import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormAlert } from "@/components/form-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/i18n";
import { SELLER_DOCUMENTS } from "@/lib/seller-schema";
import { requireMember } from "@/server/authz";
import { getSellerContact } from "@/server/contact-access";
import { getMessages } from "@/server/locale";
import { getMySeller } from "@/server/sellers";
import { indiaToday } from "@/server/visibility";
import { subscriptionState } from "@/lib/subscription";
import { SellerNav } from "./seller-nav";
import { SubscriptionStatus } from "./subscription-status";

export const metadata: Metadata = { title: "Your seller account", robots: { index: false } };

export default async function SellerPage() {
  const member = await requireMember("/seller");
  const seller = await getMySeller(member.id);
  if (!seller) redirect("/seller/apply");

  const contact = await getSellerContact({ kind: "member", id: member.id }, seller.id);
  const latestReason = (seller.status === "REJECTED" || seller.status === "SUSPENDED") && seller.statusChanges[0]?.reason;

  const approved = seller.status === "APPROVED";
  const t = await getMessages();
  const s = t.sellerArea;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      {approved && <SellerNav />}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{seller.companyName}</h1>
        <Badge variant={seller.status === "APPROVED" ? "default" : "secondary"}>{t.sellerStatuses[seller.status]}</Badge>
      </div>

      <FormAlert kind={seller.status === "REJECTED" || seller.status === "SUSPENDED" ? "error" : "success"}>
        <p>{s.status[seller.status]}</p>
        {latestReason && <p className="mt-1 font-normal">{fill(s.reason, { reason: latestReason })}</p>}
      </FormAlert>

      {approved && (
        <section aria-labelledby="subscription-heading" className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
          <h2 id="subscription-heading" className="text-lg font-semibold">
            {s.subscription}
          </h2>
          <SubscriptionStatus state={subscriptionState(seller.paidUntil, indiaToday())} paidUntil={seller.paidUntil} />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild>
              <Link href="/seller/products">{s.manageProducts}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/seller/inquiries">{s.inquiriesReceived}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/seller/subscription">{s.subscriptionDetails}</Link>
            </Button>
          </div>
        </section>
      )}

      {seller.status === "REJECTED" && (
        <Button asChild className="w-fit">
          <Link href="/seller/apply">{s.applyAgain}</Link>
        </Button>
      )}

      <section aria-labelledby="details-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <h2 id="details-heading" className="text-lg font-semibold">
          {s.details}
        </h2>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
          {[
            [s.contact, contact ? `${contact.contactName} · ${contact.phone} · ${contact.email}` : "—"],
            [s.address, `${seller.address ?? ""}, ${seller.city}, ${seller.state}`],
            ...SELLER_DOCUMENTS.map(({ kind }) => [s.docs[kind], seller.documents.find((d) => d.kind === kind)?.fileName ?? s.notProvided]),
          ].map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="text-sm text-muted-foreground">{term}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
