import type { Metadata } from "next";
import { FormAlert } from "@/components/form-feedback";
import { Badge } from "@/components/ui/badge";
import { fill } from "@/lib/i18n";
import { SELLER_DOCUMENTS } from "@/lib/seller-schema";
import { requireMember } from "@/server/authz";
import { getSellerContact } from "@/server/contact-access";
import { getMessages } from "@/server/locale";
import { getMySeller } from "@/server/sellers";
import { SellerNav } from "../seller-nav";
import { ApplicationForm, type ApplicationDefaults } from "./application-form";

export const metadata: Metadata = { title: "Company verification", robots: { index: false } };

// The second approval (client, 2026-10-24): company details and documents, checked by the team. The form
// while nothing is sent or after a rejection; otherwise its status and what was sent.
export default async function CompanyVerificationPage() {
  const member = await requireMember("/seller/companyverification");
  const seller = await getMySeller(member.id);
  const contact = seller && (await getSellerContact({ kind: "member", id: member.id }, seller.id));
  const t = await getMessages();
  const s = t.sellerArea;

  const nav = <SellerNav approved={seller?.status === "APPROVED"} />;
  if (seller && seller.status !== "REJECTED") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
        {nav}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight">{s.verification}</h1>
          <Badge variant={seller.status === "APPROVED" ? "default" : "secondary"}>{t.sellerStatuses[seller.status]}</Badge>
        </div>
        <FormAlert kind={seller.status === "SUSPENDED" ? "error" : "success"}>
          <p>{s.status[seller.status]}</p>
          {seller.status === "SUSPENDED" && seller.statusChanges[0]?.reason && <p className="mt-1 font-normal">{fill(s.reason, { reason: seller.statusChanges[0].reason })}</p>}
        </FormAlert>
        <section aria-labelledby="details-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <h2 id="details-heading" className="text-lg font-semibold">
            {s.details}
          </h2>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
            {[
              [s.companyName, seller.companyName],
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
          <p className="text-sm text-muted-foreground">{s.verifiedNote}</p>
        </section>
      </div>
    );
  }

  const defaults: ApplicationDefaults = seller
    ? {
        companyName: seller.companyName,
        contactName: seller.contactName,
        contactPhone: contact?.phone ?? member.phone,
        contactEmail: contact?.email ?? member.email ?? "",
        address: seller.address ?? "",
        city: seller.city,
        state: seller.state,
        description: seller.description ?? "",
        existingDocuments: Object.fromEntries(seller.documents.map((d) => [d.kind, d.fileName])),
      }
    : {
        companyName: "",
        contactName: "",
        contactPhone: member.phone,
        contactEmail: member.email ?? "",
        address: "",
        city: "",
        state: "Gujarat",
        description: "",
        existingDocuments: {},
      };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      {nav}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">{seller ? s.updateTitle : s.applyTitle}</h1>
        <p className="text-muted-foreground">{s.applyIntro}</p>
      </div>
      {seller && (
        <FormAlert kind="error">
          <p>{s.status.REJECTED}</p>
          {seller.statusChanges[0]?.reason && <p className="mt-1 font-normal">{fill(s.reason, { reason: seller.statusChanges[0].reason })}</p>}
        </FormAlert>
      )}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-8">
        <ApplicationForm defaults={defaults} resubmission={!!seller} />
      </div>
    </div>
  );
}
