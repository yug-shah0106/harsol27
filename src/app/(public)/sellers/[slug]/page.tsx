import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactPanel } from "@/components/contact-panel";
import { ProductGrid } from "@/components/product-card";
import { BlurText } from "@/components/motion-text";
import { fill } from "@/lib/i18n";
import { clip, pageMetadata } from "@/lib/seo";
import { getMember } from "@/server/authz";
import { getPublicSeller } from "@/server/catalog";
import { getMessages } from "@/server/locale";

export async function generateMetadata({ params }: PageProps<"/sellers/[slug]">): Promise<Metadata> {
  const seller = await getPublicSeller((await params).slug);
  if (!seller) return {};
  const { companyName, city, state } = seller;
  return pageMetadata({
    title: `${companyName}, ${city}`,
    description: clip(seller.description || `${companyName} in ${city}, ${state}: products and contact details on Harsol27, Harsol's B2B marketplace.`),
    path: `/sellers/${seller.slug}`,
    keywords: [companyName, `${companyName} ${city}`, `suppliers in ${city}`],
  });
}

export default async function SellerProfilePage({ params }: PageProps<"/sellers/[slug]">) {
  const seller = await getPublicSeller((await params).slug);
  if (!seller) notFound();
  const member = await getMember();
  const { product: p } = await getMessages();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight animate-in slide-in-from-bottom-2 duration-500 ease-out">{seller.companyName}</h1>
          <p className="text-muted-foreground">
            {seller.city}, {seller.state} · {fill(p.since, { year: seller.createdAt.getFullYear() })}
          </p>
          {seller.description && <p className="max-w-2xl whitespace-pre-line">{seller.description}</p>}
        </div>
        <aside>
          <ContactPanel
            sellerId={seller.id}
            target={{ sellerId: seller.id }}
            returnTo={`/sellers/${seller.slug}`}
            isOwner={member?.id === seller.userId}
            about={p.yourRequirement}
          />
        </aside>
      </div>

      <section aria-labelledby="products-heading" className="flex flex-col gap-4">
        <BlurText id="products-heading" text={p.products} className="text-2xl font-bold" />
        {seller.products.length > 0 ? <ProductGrid products={seller.products} /> : <p className="text-muted-foreground">{p.noProducts}</p>}
      </section>
    </div>
  );
}
