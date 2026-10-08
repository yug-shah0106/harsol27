import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormAlert } from "@/components/form-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SELLER_DOCUMENTS } from "@/lib/seller-schema";
import { SELLER_STATUS_LABELS } from "@/lib/seller-status";
import { requireMember } from "@/server/authz";
import { getSellerContact } from "@/server/contact-access";
import { getMySeller } from "@/server/sellers";
import { indiaToday } from "@/server/visibility";
import { subscriptionState } from "@/lib/subscription";
import { SellerNav } from "./seller-nav";
import { SubscriptionStatus } from "./subscription-status";

export const metadata: Metadata = { title: "Your seller account", robots: { index: false } };

const STATUS_TEXT = {
  PENDING: "Thank you for applying. Our team is reviewing your details and documents. We will email you when there is a decision.",
  APPROVED: "Your seller account is approved.",
  REJECTED: "Your application was not approved. You can correct your details or documents and apply again.",
  SUSPENDED: "Your seller account is suspended. Please contact the Harsol27 team.",
} as const;

export default async function SellerPage() {
  const member = await requireMember("/seller");
  const seller = await getMySeller(member.id);
  if (!seller) redirect("/seller/apply");

  const contact = await getSellerContact({ kind: "member", id: member.id }, seller.id);
  const latestReason = (seller.status === "REJECTED" || seller.status === "SUSPENDED") && seller.statusChanges[0]?.reason;

  const approved = seller.status === "APPROVED";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      {approved && <SellerNav />}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{seller.companyName}</h1>
        <Badge variant={seller.status === "APPROVED" ? "default" : "secondary"}>{SELLER_STATUS_LABELS[seller.status]}</Badge>
      </div>

      <FormAlert kind={seller.status === "REJECTED" || seller.status === "SUSPENDED" ? "error" : "success"}>
        <p>{STATUS_TEXT[seller.status]}</p>
        {latestReason && <p className="mt-1 font-normal">Reason: {latestReason}</p>}
      </FormAlert>

      {approved && (
        <section aria-labelledby="subscription-heading" className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
          <h2 id="subscription-heading" className="text-lg font-semibold">
            Subscription
          </h2>
          <SubscriptionStatus state={subscriptionState(seller.paidUntil, indiaToday())} paidUntil={seller.paidUntil} />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild>
              <Link href="/seller/products">Manage products</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/seller/inquiries">Inquiries received</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/seller/subscription">Subscription details</Link>
            </Button>
          </div>
        </section>
      )}

      {seller.status === "REJECTED" && (
        <Button asChild className="w-fit">
          <Link href="/seller/apply">Edit and apply again</Link>
        </Button>
      )}

      <section aria-labelledby="details-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <h2 id="details-heading" className="text-lg font-semibold">
          Your details
        </h2>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
          {[
            ["Contact", contact ? `${contact.contactName} · ${contact.phone} · ${contact.email}` : "—"],
            ["Address", `${seller.address ?? ""}, ${seller.city}, ${seller.state}`],
            ...SELLER_DOCUMENTS.map(({ kind, label }) => [label, seller.documents.find((d) => d.kind === kind)?.fileName ?? "Not provided"]),
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
