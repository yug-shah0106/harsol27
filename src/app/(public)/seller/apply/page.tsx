import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMember } from "@/server/authz";
import { getSellerContact } from "@/server/contact-access";
import { getMySeller } from "@/server/sellers";
import { ApplicationForm, type ApplicationDefaults } from "./application-form";

export const metadata: Metadata = { title: "Apply to sell", robots: { index: false } };

export default async function ApplyPage() {
  const member = await requireMember("/seller/apply");
  const seller = await getMySeller(member.id);
  if (seller && seller.status !== "REJECTED") redirect("/seller");

  const contact = seller && (await getSellerContact({ kind: "member", id: member.id }, seller.id));

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
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">{seller ? "Update your application" : "Apply to sell on Harsol27"}</h1>
        <p className="text-muted-foreground">
          Our team reviews every application. You will get an email when there is a decision.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 sm:p-8">
        <ApplicationForm defaults={defaults} resubmission={!!seller} />
      </div>
    </div>
  );
}
