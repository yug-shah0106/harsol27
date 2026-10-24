import { Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/server/authz";
import { getSellerContacts } from "@/server/contact-access";
import { listMyInquiries } from "@/server/inquiries";
import { getMessages } from "@/server/locale";
import { fill } from "@/lib/i18n";
import { formatIst } from "@/app/admin/leads/format";

export const metadata: Metadata = { title: "My inquiries", robots: { index: false } };

export default async function MyInquiriesPage() {
  const member = await requireMember("/account/inquiries");
  const inquiries = await listMyInquiries(member);
  const contacts = await getSellerContacts({ kind: "member", id: member.id }, inquiries.map((i) => i.seller.id));
  const { buyer: b, inquiry: q } = await getMessages();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{b.inquiriesTitle}</h1>
      {inquiries.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">{b.noInquiries}</p>
          <Button asChild>
            <Link href="/search">{b.searchProducts}</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {inquiries.map((inquiry) => {
            const contact = contacts.get(inquiry.seller.id);
            return (
              <li key={inquiry.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/sellers/${inquiry.seller.slug}`} className="font-semibold text-primary underline">
                    {inquiry.seller.companyName}
                  </Link>
                  <span className="text-sm text-muted-foreground">{fill(q.time, { time: formatIst(inquiry.createdAt) })}</span>
                </div>
                {inquiry.product && (
                  <p className="text-sm">
                    {q.about}
                    <Link href={`/products/${inquiry.product.slug}`} className="text-primary underline">
                      {inquiry.product.name}
                    </Link>
                  </p>
                )}
                <p className="whitespace-pre-line text-muted-foreground">{inquiry.message}</p>
                {contact && (
                  <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1">
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 font-medium text-primary underline">
                      <Phone aria-hidden="true" className="size-4" /> {contact.phone}
                    </a>
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 break-all text-primary underline">
                      <Mail aria-hidden="true" className="size-4 shrink-0" /> {contact.email}
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
