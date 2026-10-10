import type { Metadata } from "next";
import { Pagination } from "@/components/pagination";
import { ProductGrid } from "@/components/product-card";
import { SearchForm } from "@/components/search-form";
import { listIndustriesWithCounts, searchParamsSchema, searchProducts } from "@/server/catalog";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const { q } = searchParamsSchema.parse(await searchParams);
  return { title: q ? `${q} · Search` : "Search products", robots: { index: false } };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = searchParamsSchema.parse(await searchParams);
  const [{ items, total, pageCount }, industries] = await Promise.all([searchProducts(params), listIndustriesWithCounts()]);
  const searched = Boolean(params.q || params.industry || params.state || params.city);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-primary sm:text-6xl animate-in slide-in-from-bottom-2 duration-500 ease-out">{params.q ? `Results for “${params.q}”` : "Search products"}</h1>
      <SearchForm values={params} industries={industries} />
      <p aria-live="polite" className="text-muted-foreground">
        {total === 0
          ? searched
            ? "No products match. Try fewer words, or search all of India."
            : "No products are listed yet."
          : `${total} ${total === 1 ? "product" : "products"}`}
      </p>
      {items.length > 0 && <ProductGrid products={items} priorityCount={4} />}
      <Pagination basePath="/search" params={{ q: params.q, industry: params.industry, state: params.state, city: params.city }} page={params.page} pageCount={pageCount} />
    </div>
  );
}
