import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/pagination";
import { ProductGrid } from "@/components/product-card";
import { SearchForm } from "@/components/search-form";
import { getActiveIndustryBySlug, searchParamsSchema, searchProducts } from "@/server/catalog";

export async function generateMetadata({ params }: PageProps<"/industries/[slug]">): Promise<Metadata> {
  const industry = await getActiveIndustryBySlug((await params).slug);
  return industry ? { title: industry.name, description: `${industry.name} suppliers from Gujarat on Harsol27.` } : {};
}

export default async function IndustryPage({ params, searchParams }: PageProps<"/industries/[slug]">) {
  const industry = await getActiveIndustryBySlug((await params).slug);
  if (!industry) notFound();
  const search = { ...searchParamsSchema.parse(await searchParams), industry: industry.slug };
  const { items, total, pageCount } = await searchProducts(search);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <Link href="/industries" className="w-fit text-sm text-primary underline">
          ← All industries
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">{industry.name}</h1>
      </div>
      <SearchForm values={search} action={`/industries/${industry.slug}`} />
      <p aria-live="polite" className="text-muted-foreground">
        {total === 0 ? "No products in this industry match yet." : `${total} ${total === 1 ? "product" : "products"}`}
      </p>
      {items.length > 0 && <ProductGrid products={items} priorityCount={4} />}
      <Pagination basePath={`/industries/${industry.slug}`} params={{ q: search.q, state: search.state, city: search.city }} page={search.page} pageCount={pageCount} />
    </div>
  );
}
