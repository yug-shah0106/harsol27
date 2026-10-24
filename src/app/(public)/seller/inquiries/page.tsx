import { Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { formatIst } from "@/app/admin/leads/format";
import { fill } from "@/lib/i18n";
import { inquiryPageSchema, listInquiries } from "@/server/inquiries";
import { getMessages } from "@/server/locale";
import { requireSellerPage } from "../seller-page";
import { SellerNav } from "../seller-nav";

export const metadata: Metadata = { title: "Inquiries received", robots: { index: false } };

export default async function SellerInquiriesPage({ searchParams }: PageProps<"/seller/inquiries">) {
  const { seller } = await requireSellerPage("/seller/inquiries");
  const params = inquiryPageSchema.parse(await searchParams);
  const { items, total, pageCount } = await listInquiries({ page: params.page }, { sellerId: seller.id });
  const { sellerArea: s, inquiry: q } = await getMessages();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <SellerNav />
      <h1 className="text-3xl font-extrabold tracking-tight">{s.received}</h1>
      <p className="text-muted-foreground">{total === 0 ? s.noInquiries : fill(total === 1 ? s.inquiryOne : s.inquiryMany, { n: total })}</p>
      <ul className="flex flex-col gap-4">
        {items.map((inquiry) => (
          <li key={inquiry.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold">{inquiry.buyerName}</span>
              <span className="text-sm text-muted-foreground">{fill(q.time, { time: formatIst(inquiry.createdAt) })}</span>
            </div>
            <a href={`tel:${inquiry.buyerPhone}`} className="flex w-fit items-center gap-1.5 font-medium text-primary underline">
              <Phone aria-hidden="true" className="size-4" /> {inquiry.buyerPhone}
            </a>
            {inquiry.product && (
              <p className="text-sm">
                {q.about}
                <Link href={`/products/${inquiry.product.slug}`} className="text-primary underline">
                  {inquiry.product.name}
                </Link>
              </p>
            )}
            <p className="whitespace-pre-line">{inquiry.message}</p>
          </li>
        ))}
      </ul>
      <Pagination basePath="/seller/inquiries" params={{}} page={params.page} pageCount={pageCount} />
    </div>
  );
}
