import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStaff } from "@/server/authz";
import { listProductsForStaff, staffProductParamsSchema } from "@/server/products";
import { formatIst } from "../leads/format";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireStaff();
  const params = staffProductParamsSchema.parse(await searchParams);
  const { items, total, pageCount } = await listProductsForStaff(params);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Products</h1>
      <form method="get" role="search" aria-label="Filter products" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="q">Search product or seller</Label>
          <Input id="q" name="q" type="search" defaultValue={params.q ?? ""} maxLength={100} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="state">Status</Label>
          <NativeSelect id="state" name="state" defaultValue={params.state ?? ""} className="w-full sm:w-48">
            <NativeSelectOption value="">Any</NativeSelectOption>
            <NativeSelectOption value="listed">Listed</NativeSelectOption>
            <NativeSelectOption value="hidden">Hidden by seller</NativeSelectOption>
            <NativeSelectOption value="removed">Removed by staff</NativeSelectOption>
          </NativeSelect>
        </div>
        <Button type="submit">Apply</Button>
      </form>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {total === 0 ? "No products match." : `${total} ${total === 1 ? "product" : "products"}`}
      </p>

      {items.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Product</TableHead>
                <TableHead scope="col">Seller</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Inquiries</TableHead>
                <TableHead scope="col">Added (IST)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/products/${p.id}`} className="text-primary underline">
                      {p.name}
                    </Link>
                    <div className="text-sm font-normal text-muted-foreground">{p.industry.name}</div>
                  </TableCell>
                  <TableCell>{p.seller.companyName}</TableCell>
                  <TableCell>
                    <Badge variant={p.removedAt ? "destructive" : p.isHidden ? "outline" : "secondary"}>{p.removedAt ? "Removed" : p.isHidden ? "Hidden" : "Listed"}</Badge>
                  </TableCell>
                  <TableCell>{p._count.inquiries}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatIst(p.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination basePath="/admin/products" params={{ q: params.q, state: params.state }} page={params.page} pageCount={pageCount} />
    </div>
  );
}
