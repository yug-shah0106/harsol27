import { ImageOff, Lock } from "lucide-react";
import Link from "next/link";
import { ProductPhoto } from "@/components/product-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fill, industryName } from "@/lib/i18n";
import type { Messages } from "@/i18n/en";
import type { listMyProducts } from "@/server/products";
import { SendForApproval } from "../dashboard/send-for-approval";

type MyProduct = Awaited<ReturnType<typeof listMyProducts>>[number];

/** Why buyers can or cannot see a product, worst first. `awaiting`: the seller is not approved yet. */
function stateOf(p: MyProduct, subscriptionActive: boolean, awaiting = false) {
  return p.removedAt ? "removed"
    : p.isHidden ? "hidden"
    : awaiting ? "awaiting"
    : !p.industry.isActive ? "industryInactive"
    : !subscriptionActive ? "subscriptionInactive"
    : "live";
}

export const isLive = (p: MyProduct, subscriptionActive: boolean) => stateOf(p, subscriptionActive) === "live";

/** A suspended seller cannot change their listing. */
export function SuspendedListing({ t }: { t: Messages }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-card p-6">
      <Lock aria-hidden="true" className="size-6 shrink-0 text-muted-foreground" />
      <p className="font-semibold">{t.sellerArea.status.SUSPENDED}</p>
    </div>
  );
}

/**
 * Before approval: both are approved together, and what is left to do. `ready`: company details saved and a product
 * added, so they can be sent; until then a link to the company details if those are missing.
 */
export function ReviewTogether({ t, ready, detailsSaved }: { t: Messages; ready: boolean; detailsSaved: boolean }) {
  const s = t.sellerArea;
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-secondary p-3 text-sm">
      <p>{s.reviewTogether}</p>
      {ready && <SendForApproval label={s.sendForApproval} />}
      {!detailsSaved && (
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/seller/companyverification">{s.verification}</Link>
        </Button>
      )}
    </div>
  );
}

/** The seller's products as rows: main photo, name, industry, counts and whether buyers see it. */
export function MyProductList({ products, subscriptionActive, awaitingLabel, t }: { products: MyProduct[]; subscriptionActive: boolean; awaitingLabel?: string; t: Messages }) {
  const s = t.sellerArea;
  const badges = {
    removed: { label: s.removedBadge, variant: "destructive" },
    hidden: { label: s.hiddenBadge, variant: "outline" },
    awaiting: { label: awaitingLabel ?? "", variant: "secondary" },
    industryInactive: { label: s.industryInactive, variant: "outline" },
    subscriptionInactive: { label: s.subscriptionInactive, variant: "outline" },
    live: { label: s.live, variant: "default" },
  } as const;
  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
      {products.map((product) => {
        const badge = badges[stateOf(product, subscriptionActive, !!awaitingLabel)];
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
