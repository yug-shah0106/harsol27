import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactPanel } from "@/components/contact-panel";
import { ProductGrid } from "@/components/product-card";
import { getMember } from "@/server/authz";
import { getPublicSeller } from "@/server/catalog";

export async function generateMetadata({ params }: PageProps<"/sellers/[slug]">): Promise<Metadata> {
  const seller = await getPublicSeller((await params).slug);
  return seller ? { title: seller.companyName, description: seller.description?.slice(0, 160) ?? `${seller.companyName}, ${seller.city}` } : {};
}

export default async function SellerProfilePage({ params }: PageProps<"/sellers/[slug]">) {
  const seller = await getPublicSeller((await params).slug);
  if (!seller) notFound();
  const member = await getMember();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight">{seller.companyName}</h1>
          <p className="text-muted-foreground">
            {seller.city}, {seller.state} · On Harsol27 since {seller.createdAt.getFullYear()}
          </p>
          {seller.description && <p className="max-w-2xl whitespace-pre-line">{seller.description}</p>}
        </div>
        <aside>
          <ContactPanel
            sellerId={seller.id}
            target={{ sellerId: seller.id }}
            returnTo={`/sellers/${seller.slug}`}
            isOwner={member?.id === seller.userId}
            about="your requirement"
          />
        </aside>
      </div>

      <section aria-labelledby="products-heading" className="flex flex-col gap-4">
        <h2 id="products-heading" className="text-2xl font-bold">
          Products
        </h2>
        {seller.products.length > 0 ? <ProductGrid products={seller.products} /> : <p className="text-muted-foreground">No products listed yet.</p>}
      </section>
    </div>
  );
}
