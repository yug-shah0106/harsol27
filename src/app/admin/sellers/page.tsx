import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SELLER_STATUS_LABELS, type SellerStatusValue } from "@/lib/seller-status";
import { requireStaff } from "@/server/authz";
import { listSellers, sellerListParamsSchema, type SellerListParams } from "@/server/sellers";
import { formatIst } from "../leads/format";

export const metadata: Metadata = { title: "Sellers" };

function pageHref(params: SellerListParams, page: number): string {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.q) qs.set("q", params.q);
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `/admin/sellers?${s}` : "/admin/sellers";
}

export default async function SellersPage({ searchParams }: PageProps<"/admin/sellers">) {
  await requireStaff();
  const params = sellerListParamsSchema.parse(await searchParams);
  const { items, total, pageCount } = await listSellers(params);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Sellers</h1>

      <form method="get" role="search" aria-label="Filter sellers" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="q">Search company, contact or city</Label>
          <Input id="q" name="q" type="search" defaultValue={params.q ?? ""} maxLength={100} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="status">Status</Label>
          <Dropdown
            id="status"
            name="status"
            defaultValue={params.status ?? ""}
            className="w-full sm:w-48"
            options={[{ value: "", label: "Any" }, ...(Object.keys(SELLER_STATUS_LABELS) as SellerStatusValue[]).map((s) => ({ value: s, label: SELLER_STATUS_LABELS[s] }))]}
          />
        </div>
        <Button type="submit">Apply</Button>
      </form>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {total === 0 ? "No sellers match." : `${total} ${total === 1 ? "seller" : "sellers"}${pageCount > 1 ? ` · page ${params.page} of ${pageCount}` : ""}`}
      </p>

      {items.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Company</TableHead>
                <TableHead scope="col">Location</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Last change (IST)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((seller) => (
                <TableRow key={seller.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/sellers/${seller.id}`} className="text-primary underline">
                      {seller.companyName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {seller.city}, {seller.state}
                  </TableCell>
                  <TableCell>
                    <Badge variant={seller.status === "PENDING" ? "default" : "secondary"}>{SELLER_STATUS_LABELS[seller.status]}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatIst(seller.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex justify-between gap-4">
          {params.page > 1 ? (
            <Button asChild variant="outline">
              <Link href={pageHref(params, params.page - 1)}>Previous page</Link>
            </Button>
          ) : (
            <span />
          )}
          {params.page < pageCount && (
            <Button asChild variant="outline">
              <Link href={pageHref(params, params.page + 1)}>Next page</Link>
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
