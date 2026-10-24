import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { FormAlert } from "@/components/form-feedback";
import { HTML_LANG, industryName } from "@/lib/i18n";
import { parseSpecifications } from "@/lib/product-schema";
import { listActiveIndustries } from "@/server/industries";
import { getLocale, getMessages } from "@/server/locale";
import { getMyProduct } from "@/server/products";
import { requireSellerPage } from "../../seller-page";
import { setHiddenAction } from "../actions";
import { PhotoManager } from "../photo-manager";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Edit product", robots: { index: false } };

export default async function EditProductPage({ params, searchParams }: PageProps<"/seller/products/[id]">) {
  const { id } = await params;
  const { seller } = await requireSellerPage(`/seller/products/${id}`);
  const product = await getMyProduct(seller.id, id);
  if (!product) notFound();
  const [locale, t] = [await getLocale(), await getMessages()];
  const s = t.sellerArea;
  const industries = (await listActiveIndustries())
    .map((industry) => ({ id: industry.id, name: industryName(t, industry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, HTML_LANG[locale]));
  // A product in an industry that was since deactivated keeps it selectable until the seller changes it.
  if (!industries.some((i) => i.id === product.industryId)) industries.push({ id: product.industryId, name: `${industryName(t, product.industry.name)}${s.inactive}` });
  const created = (await searchParams).created === "1";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <Link href="/seller/products" className="w-fit text-sm text-primary underline">
          {s.back}
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">{product.name}</h1>
        <Link href={`/products/${product.slug}`} className="w-fit text-sm text-primary underline">
          {s.viewPage}
        </Link>
      </div>

      {created && <FormAlert kind="success">{s.created}</FormAlert>}
      {product.removedAt && (
        <FormAlert kind="error">{s.removedNote}</FormAlert>
      )}

      {!product.removedAt && (
        <>
          <section aria-labelledby="photos-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <h2 id="photos-heading" className="text-lg font-semibold">
              {s.photos}
            </h2>
            <PhotoManager productId={product.id} photos={product.photos.map((p) => ({ id: p.id, status: p.status }))} />
          </section>

          <section aria-labelledby="details-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:p-8">
            <h2 id="details-heading" className="text-lg font-semibold">
              {s.productDetails}
            </h2>
            <ProductForm
              productId={product.id}
              values={{ name: product.name, industryId: product.industryId, description: product.description, specifications: parseSpecifications(product.specifications) }}
              industries={industries}
            />
          </section>

          <section aria-labelledby="visibility-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <h2 id="visibility-heading" className="text-lg font-semibold">
              {s.visibility}
            </h2>
            <p className="text-muted-foreground">{product.isHidden ? s.hiddenText : s.shownText}</p>
            <ActionForm action={setHiddenAction}>
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="hidden" value={String(!product.isHidden)} />
              <SubmitButton variant="outline">{product.isHidden ? s.show : s.hide}</SubmitButton>
            </ActionForm>
          </section>
        </>
      )}
    </div>
  );
}
