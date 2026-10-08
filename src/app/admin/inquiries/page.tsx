import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireStaff } from "@/server/authz";
import { inquiryPageSchema, listInquiries } from "@/server/inquiries";
import { formatIst } from "../leads/format";

export const metadata: Metadata = { title: "Inquiries" };

export default async function AdminInquiriesPage({ searchParams }: PageProps<"/admin/inquiries">) {
  await requireStaff();
  const params = inquiryPageSchema.parse(await searchParams);
  const { items, total, pageCount } = await listInquiries(params, "all");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Inquiries</h1>
      <form method="get" role="search" aria-label="Filter inquiries" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="q">Search buyer, phone, product or seller</Label>
          <Input id="q" name="q" type="search" defaultValue={params.q ?? ""} maxLength={100} />
        </div>
        <Button type="submit">Apply</Button>
      </form>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {total === 0 ? "No inquiries match." : `${total} ${total === 1 ? "inquiry" : "inquiries"}`}
      </p>
      <ul className="flex flex-col gap-4">
        {items.map((inquiry) => (
          <li key={inquiry.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span>
                <strong>{inquiry.buyerName}</strong> ({inquiry.buyerPhone}) →{" "}
                <Link href={`/admin/sellers/${inquiry.seller.id}`} className="text-primary underline">
                  {inquiry.seller.companyName}
                </Link>
              </span>
              <span className="text-sm text-muted-foreground">{formatIst(inquiry.createdAt)} IST</span>
            </div>
            {inquiry.product && <p className="text-sm">About {inquiry.product.name}</p>}
            <p className="whitespace-pre-line">{inquiry.message}</p>
            <p className="text-xs text-muted-foreground">
              IP {inquiry.sourceIp ?? "not recorded"} · {inquiry.userAgent ?? "browser not recorded"}
            </p>
          </li>
        ))}
      </ul>
      <Pagination basePath="/admin/inquiries" params={{ q: params.q }} page={params.page} pageCount={pageCount} />
    </div>
  );
}
