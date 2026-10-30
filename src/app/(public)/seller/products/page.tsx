import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { mayEditApplication, mayListProducts } from "@/lib/seller-status";
import { requireMember } from "@/server/authz";
import { getMessages } from "@/server/locale";
import { listMyProducts } from "@/server/products";
import { getMySeller } from "@/server/sellers";
import { indiaToday } from "@/server/visibility";
import { SellerNav } from "../seller-nav";
import { MyProductList, ReviewTogether, SuspendedListing } from "./product-list";

export const metadata: Metadata = { title: "Product listing", robots: { index: false } };

// Open to every seller login from the start: the seller fills in this and the company details, in either order, then
// sends both for approval together (client, 2026-10-30; the first product starts a draft: products.ts → ensureListingSeller).
export default async function MyProductsPage() {
  const member = await requireMember("/seller/products");
  const seller = await getMySeller(member.id);
  const t = await getMessages();
  const s = t.sellerArea;

  if (seller && !mayListProducts(seller.status)) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
        <SellerNav approved={false} />
        <h1 className="text-3xl font-extrabold tracking-tight">{s.products}</h1>
        <SuspendedListing t={t} />
      </div>
    );
  }

  const approved = seller?.status === "APPROVED";
  const products = seller ? await listMyProducts(seller.id) : [];
  const subscriptionActive = !!seller?.paidUntil && seller.paidUntil >= indiaToday();
  const detailsSaved = !!seller?.detailsSavedAt;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <SellerNav approved={approved} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{s.yourProducts}</h1>
        <Button asChild>
          <Link href="/seller/products/new">
            <Plus aria-hidden="true" /> {s.addProduct}
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground">{s.listingHow}</p>
      {!approved ? (
        <ReviewTogether t={t} detailsSaved={detailsSaved} ready={detailsSaved && products.length > 0 && mayEditApplication(seller!.status)} />
      ) : (
        !subscriptionActive && (
          <p className="rounded-lg border border-border bg-secondary p-3 text-sm">
            <strong>{s.notVisible}</strong>
            {s.notVisibleAfter}
          </p>
        )
      )}
      {products.length === 0 ? (
        <p className="text-muted-foreground">{s.noProducts}</p>
      ) : (
        <MyProductList products={products} subscriptionActive={subscriptionActive} awaitingLabel={approved ? undefined : seller?.status === "DRAFT" ? t.sellerStatuses.DRAFT : s.awaitingBadge} t={t} />
      )}
    </div>
  );
}
