import { ImageOff, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductPhoto } from "@/components/product-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listMyProducts } from "@/server/products";
import { indiaToday } from "@/server/visibility";
import { requireSellerPage } from "../seller-page";
import { SellerNav } from "../seller-nav";

export const metadata: Metadata = { title: "Your products", robots: { index: false } };

export default async function MyProductsPage() {
  const { seller } = await requireSellerPage("/seller/products");
  const products = await listMyProducts(seller.id);
  const subscriptionActive = !!seller.paidUntil && seller.paidUntil >= indiaToday();

  const statusOf = (p: (typeof products)[number]) =>
    p.removedAt ? { label: "Removed by Harsol27", variant: "destructive" as const }
    : p.isHidden ? { label: "Hidden", variant: "outline" as const }
    : !p.industry.isActive ? { label: "Not visible: industry inactive", variant: "outline" as const }
    : !subscriptionActive ? { label: "Not visible: subscription inactive", variant: "outline" as const }
    : { label: "Live", variant: "default" as const };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <SellerNav />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Your products</h1>
        <Button asChild>
          <Link href="/seller/products/new">
            <Plus aria-hidden="true" /> Add a product
          </Link>
        </Button>
      </div>
      {!subscriptionActive && (
        <p className="rounded-lg border border-border bg-secondary p-3 text-sm">
          <strong>Your products are not visible to buyers</strong> until your yearly subscription is active. You can still add and edit them.
        </p>
      )}
      {products.length === 0 ? (
        <p className="text-muted-foreground">You have not added any products yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
          {products.map((product) => {
            const status = statusOf(product);
            return (
              <li key={product.id} className="flex items-center gap-4 p-4">
                <div className="size-16 shrink-0 overflow-hidden rounded-md bg-secondary">
                  {product.photos[0] ? (
                    <ProductPhoto id={product.photos[0].id} alt="" sizes="64px" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageOff aria-hidden="true" className="size-5" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link href={`/seller/products/${product.id}`} className="font-semibold text-primary underline">
                    {product.name}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {product.industry.name} · {product._count.photos} {product._count.photos === 1 ? "photo" : "photos"} · {product._count.inquiries}{" "}
                    {product._count.inquiries === 1 ? "inquiry" : "inquiries"}
                  </span>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
