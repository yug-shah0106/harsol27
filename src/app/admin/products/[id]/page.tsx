import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { ProductPhoto } from "@/components/product-photo";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseSpecifications } from "@/lib/product-schema";
import { SELLER_STATUS_LABELS } from "@/lib/seller-status";
import { requireStaff } from "@/server/authz";
import { getProductForStaff } from "@/server/products";
import { canWrite } from "@/server/staff-policy";
import { formatIst } from "../../leads/format";
import { moderateProductAction } from "../actions";

export const metadata: Metadata = { title: "Product" };

const ACTIONS: Record<string, string> = { PRODUCT_REMOVED: "Removed", PRODUCT_RESTORED: "Restored" };

export default async function AdminProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const staff = await requireStaff();
  const product = await getProductForStaff((await params).id);
  if (!product) notFound();
  const specs = parseSpecifications(product.specifications);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/admin/products" className="w-fit text-sm text-primary underline">
          ← All products
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <Badge variant={product.removedAt ? "destructive" : product.isHidden ? "outline" : "secondary"}>
            {product.removedAt ? "Removed" : product.isHidden ? "Hidden by seller" : "Listed"}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          <Link href={`/admin/sellers/${product.seller.id}`} className="text-primary underline">
            {product.seller.companyName}
          </Link>{" "}
          ({SELLER_STATUS_LABELS[product.seller.status]}
          {product.seller.paidUntil ? `, paid until ${formatIst(product.seller.paidUntil).split(",")[0]}` : ", no subscription"}) · {product.industry.name} ·{" "}
          {product._count.inquiries} {product._count.inquiries === 1 ? "inquiry" : "inquiries"} ·{" "}
          <Link href={`/products/${product.slug}`} className="text-primary underline">
            Product page
          </Link>
        </p>
      </div>

      {product.photos.some((p) => p.status === "READY") && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6" aria-label="Photos">
          {product.photos
            .filter((p) => p.status === "READY")
            .map((photo, i) => (
              <li key={photo.id} className="aspect-square overflow-hidden rounded-lg border border-border bg-secondary">
                <ProductPhoto id={photo.id} alt={`Photo ${i + 1}`} sizes="160px" className="h-full w-full object-cover" />
              </li>
            ))}
        </ul>
      )}

      <section aria-labelledby="description-heading" className="flex flex-col gap-2">
        <h2 id="description-heading" className="text-lg font-semibold">
          Description
        </h2>
        <p className="whitespace-pre-line">{product.description}</p>
        {specs.length > 0 && (
          <dl className="mt-2 grid max-w-xl gap-x-6 gap-y-1 sm:grid-cols-[max-content_1fr]">
            {specs.map((s, i) => (
              <div key={i} className="contents">
                <dt className="text-muted-foreground">{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {canWrite(staff) ? (
        <section aria-labelledby="moderation-heading" className="flex max-w-xl flex-col gap-3">
          <h2 id="moderation-heading" className="text-lg font-semibold">
            Moderation
          </h2>
          <ActionForm action={moderateProductAction} className="flex flex-col gap-3">
            <input type="hidden" name="productId" value={product.id} />
            {product.removedAt ? (
              <SubmitButton name="intent" value="restore" className="w-fit">
                Restore listing
              </SubmitButton>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="reason">Reason for removing (kept in the activity log)</Label>
                  <Textarea id="reason" name="reason" rows={3} maxLength={1000} />
                </div>
                <ConfirmButton
                  name="intent"
                  value="remove"
                  className="w-fit"
                  title="Remove this listing?"
                  description="It leaves the site straight away, and shows as “Removed by Harsol27” in the seller’s list. You can restore it later."
                >
                  Remove listing
                </ConfirmButton>
              </>
            )}
          </ActionForm>
        </section>
      ) : (
        <p className="rounded-lg border border-border bg-secondary p-3 text-sm">You have view-only access.</p>
      )}

      <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
        <h2 id="activity-heading" className="text-lg font-semibold">
          Activity
        </h2>
        <ol className="flex flex-col gap-3 border-l-2 border-border pl-4">
          <li>
            <p className="font-medium">Added by the seller</p>
            <p className="text-sm text-muted-foreground">{formatIst(product.createdAt)} IST</p>
          </li>
          {[...product.activity].reverse().map((entry) => (
            <li key={entry.id}>
              <p className="font-medium">{ACTIONS[entry.action] ?? entry.action}</p>
              <p className="text-sm text-muted-foreground">
                {formatIst(entry.createdAt)} IST · by {entry.actor.name}
              </p>
              {typeof entry.details === "object" && entry.details && "reason" in entry.details && <p className="mt-1">Reason: {String(entry.details.reason)}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
