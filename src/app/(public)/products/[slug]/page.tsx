import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactPanel } from "@/components/contact-panel";
import { FormAlert } from "@/components/form-feedback";
import { ProductPhoto } from "@/components/product-photo";
import { parseSpecifications } from "@/lib/product-schema";
import { getViewer } from "@/server/authz";
import { getProductForPage } from "@/server/catalog";

async function load(slug: string) {
  return getProductForPage(slug, await getViewer());
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await load((await params).slug);
  if (!product) return {};
  return {
    title: `${product.name} · ${product.seller.companyName}`,
    description: product.description.slice(0, 160),
    robots: product.isPublic ? undefined : { index: false },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const product = await load((await params).slug);
  if (!product) notFound();
  const specs = parseSpecifications(product.specifications);
  const [main, ...rest] = product.photos;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      {!product.isPublic && (
        <FormAlert kind="error">
          Only you can see this page: this listing is not visible to buyers
          {product.removedAt ? " (removed by the Harsol27 team)." : product.isHidden ? " (hidden)." : " (seller not active yet)."}
        </FormAlert>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Link href={`/industries/${product.industry.slug}`} className="w-fit text-sm text-primary underline">
              {product.industry.name}
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground">
              by{" "}
              <Link href={`/sellers/${product.seller.slug}`} className="font-medium text-primary underline">
                {product.seller.companyName}
              </Link>
              , {product.seller.city}, {product.seller.state}
            </p>
          </div>

          {main && (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-xl border border-border bg-secondary">
                <ProductPhoto id={main.id} alt={product.name} width={main.width} height={main.height} sizes="(min-width: 1024px) 60vw, 92vw" priority className="h-auto w-full" />
              </div>
              {rest.length > 0 && (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4" aria-label="More photos">
                  {rest.map((photo, i) => (
                    <li key={photo.id} className="overflow-hidden rounded-lg border border-border bg-secondary">
                      <a href={`/media/photos/${photo.id}/1600.webp`} target="_blank" rel="noopener" aria-label={`Photo ${i + 2} of ${product.photos.length}, full size (opens in a new tab)`}>
                        <ProductPhoto id={photo.id} alt="" width={photo.width} height={photo.height} sizes="(min-width: 640px) 20vw, 30vw" className="aspect-square h-full w-full object-cover" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <section aria-labelledby="description-heading" className="flex flex-col gap-2">
            <h2 id="description-heading" className="text-xl font-bold">
              Description
            </h2>
            <p className="whitespace-pre-line">{product.description}</p>
          </section>

          {specs.length > 0 && (
            <section aria-labelledby="specs-heading" className="flex flex-col gap-2">
              <h2 id="specs-heading" className="text-xl font-bold">
                Specifications
              </h2>
              <table className="w-full max-w-xl border-collapse text-left">
                <tbody>
                  {specs.map((spec, i) => (
                    <tr key={i} className="border-b border-border">
                      <th scope="row" className="py-2 pr-4 align-top font-medium text-muted-foreground">
                        {spec.label}
                      </th>
                      <td className="py-2">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          {product.isPublic || product.isOwner ? (
            <ContactPanel
              sellerId={product.seller.id}
              target={{ productId: product.id }}
              returnTo={`/products/${product.slug}`}
              isOwner={product.isOwner}
              about={product.name}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
