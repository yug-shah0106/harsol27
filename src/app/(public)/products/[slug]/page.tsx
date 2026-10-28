import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactPanel } from "@/components/contact-panel";
import { FormAlert } from "@/components/form-feedback";
import { ProductPhoto } from "@/components/product-photo";
import { fill, industryName } from "@/lib/i18n";
import { parseSpecifications } from "@/lib/product-schema";
import { clip, pageMetadata } from "@/lib/seo";
import { getViewer } from "@/server/authz";
import { getProductForPage } from "@/server/catalog";
import { getMessages } from "@/server/locale";

async function load(slug: string) {
  return getProductForPage(slug, await getViewer());
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await load((await params).slug);
  if (!product) return {};
  const { companyName, city } = product.seller;
  return {
    ...pageMetadata({
      title: `${product.name} · ${companyName}`,
      description: clip(`${product.name} from ${companyName}, ${city}. ${product.description}`),
      path: `/products/${product.slug}`,
      keywords: [product.name, `${product.name} ${city}`, `${product.name} supplier Harsol`, product.industry.name, companyName],
    }),
    robots: product.isPublic ? undefined : { index: false },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const product = await load((await params).slug);
  if (!product) notFound();
  const specs = parseSpecifications(product.specifications);
  const [main, ...rest] = product.photos;
  const t = await getMessages();
  const p = t.product;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      {!product.isPublic && (
        <FormAlert kind="error">
          {p.notPublic}
          {product.removedAt ? p.removed : product.isHidden ? p.hidden : p.inactive}
        </FormAlert>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Link href={`/industries/${product.industry.slug}`} className="w-fit text-sm text-primary underline">
              {industryName(t, product.industry.name)}
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight animate-in slide-in-from-bottom-2 duration-500 ease-out">{product.name}</h1>
            <p className="text-muted-foreground">
              {p.by}
              <Link href={`/sellers/${product.seller.slug}`} className="font-medium text-primary underline">
                {product.seller.companyName}
              </Link>
              , {product.seller.city}, {product.seller.state}
            </p>
          </div>

          {main && (
            <div className="flex flex-col gap-3">
              {/* Each photo with the seller's name for it, when given: the model or size it shows ("S1", "5 litre"). */}
              <figure className="overflow-hidden rounded-xl border border-border bg-secondary">
                <ProductPhoto id={main.id} alt={main.name ? `${product.name}: ${main.name}` : product.name} width={main.width} height={main.height} sizes="(min-width: 1024px) 60vw, 92vw" priority className="h-auto w-full" />
                {main.name && <figcaption className="bg-card px-3 py-2 text-sm font-semibold">{main.name}</figcaption>}
              </figure>
              {rest.length > 0 && (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4" aria-label={p.morePhotos}>
                  {rest.map((photo, i) => (
                    <li key={photo.id} className="flex flex-col overflow-hidden rounded-lg border border-border bg-secondary">
                      <a href={`/media/photos/${photo.id}/1600.webp`} target="_blank" rel="noopener" aria-label={`${photo.name ? `${photo.name}. ` : ""}${fill(p.photoOf, { n: i + 2, count: product.photos.length })}`}>
                        <ProductPhoto id={photo.id} alt="" width={photo.width} height={photo.height} sizes="(min-width: 640px) 20vw, 30vw" className="aspect-square h-full w-full object-cover" />
                      </a>
                      {photo.name && (
                        <span aria-hidden="true" className="truncate bg-card px-2 py-1.5 text-center text-sm font-semibold">
                          {photo.name}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <section aria-labelledby="description-heading" data-reveal className="flex flex-col gap-2">
            <h2 id="description-heading" className="text-xl font-bold">
              {p.description}
            </h2>
            <p className="whitespace-pre-line">{product.description}</p>
          </section>

          {specs.length > 0 && (
            <section aria-labelledby="specs-heading" data-reveal className="flex flex-col gap-2">
              <h2 id="specs-heading" className="text-xl font-bold">
                {p.specifications}
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
