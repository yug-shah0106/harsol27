import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormAlert } from "@/components/form-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SELLER_DOCUMENTS } from "@/lib/seller-schema";
import { SELLER_STATUS_LABELS } from "@/lib/seller-status";
import { requireMember } from "@/server/authz";
import { getMySeller } from "@/server/sellers";

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

  const latestReason = (seller.status === "REJECTED" || seller.status === "SUSPENDED") && seller.statusChanges[0]?.reason;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{seller.companyName}</h1>
        <Badge variant={seller.status === "APPROVED" ? "default" : "secondary"}>{SELLER_STATUS_LABELS[seller.status]}</Badge>
      </div>

      <FormAlert kind={seller.status === "REJECTED" || seller.status === "SUSPENDED" ? "error" : "success"}>
        <p>{STATUS_TEXT[seller.status]}</p>
        {latestReason && <p className="mt-1 font-normal">Reason: {latestReason}</p>}
      </FormAlert>

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
            ["Contact", `${seller.contactName} · ${seller.contactPhone} · ${seller.contactEmail}`],
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
