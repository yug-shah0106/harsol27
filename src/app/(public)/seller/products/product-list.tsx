import { ImageOff, Lock } from "lucide-react";
import Link from "next/link";
import { ProductPhoto } from "@/components/product-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fill, industryName } from "@/lib/i18n";
import type { Messages } from "@/i18n/en";
import type { listMyProducts } from "@/server/products";

type MyProduct = Awaited<ReturnType<typeof listMyProducts>>[number];

/** Why buyers can or cannot see a product, worst first. */
function stateOf(p: MyProduct, subscriptionActive: boolean) {
  return p.removedAt ? "removed" : p.isHidden ? "hidden" : !p.industry.isActive ? "industryInactive" : !subscriptionActive ? "subscriptionInactive" : "live";
}

export const isLive = (p: MyProduct, subscriptionActive: boolean) => stateOf(p, subscriptionActive) === "live";

/** Before the company is verified: what the listing will be, and the way there. */
export function LockedListing({ t }: { t: Messages }) {
  const s = t.sellerArea;
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-card p-6">
      <Lock aria-hidden="true" className="size-6 text-muted-foreground" />
      <p className="font-semibold">{s.listingLocked}</p>
      <p className="text-muted-foreground">{s.listingHow}</p>
      <Button asChild variant="outline" className="rounded-full">
        <Link href="/seller/companyverification">{s.verification}</Link>
      </Button>
    </div>
  );
}

/** The seller's products as rows: main photo, name, industry, counts and whether buyers see it. */
export function MyProductList({ products, subscriptionActive, t }: { products: MyProduct[]; subscriptionActive: boolean; t: Messages }) {
  const s = t.sellerArea;
  const badges = {
    removed: { label: s.removedBadge, variant: "destructive" },
    hidden: { label: s.hiddenBadge, variant: "outline" },
    industryInactive: { label: s.industryInactive, variant: "outline" },
    subscriptionInactive: { label: s.subscriptionInactive, variant: "outline" },
    live: { label: s.live, variant: "default" },
  } as const;
  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
      {products.map((product) => {
        const badge = badges[stateOf(product, subscriptionActive)];
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
                {industryName(t, product.industry.name)} · {fill(product._count.photos === 1 ? s.photoOne : s.photoMany, { n: product._count.photos })} ·{" "}
                {fill(product._count.inquiries === 1 ? s.inquiryOne : s.inquiryMany, { n: product._count.inquiries })}
              </span>
            </div>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </li>
        );
      })}
    </ul>
  );
}
