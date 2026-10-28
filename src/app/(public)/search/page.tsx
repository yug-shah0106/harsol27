import type { Metadata } from "next";
import { Pagination } from "@/components/pagination";
import { ProductGrid } from "@/components/product-card";
import { SearchForm } from "@/components/search-form";
import { fill } from "@/lib/i18n";
import { listIndustriesWithCounts, searchParamsSchema, searchProducts } from "@/server/catalog";
import { getMessages } from "@/server/locale";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const { q } = searchParamsSchema.parse(await searchParams);
  return { title: q ? `${q} · Search` : "Search products", robots: { index: false } };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = searchParamsSchema.parse(await searchParams);
  const [{ items, total, pageCount }, industries] = await Promise.all([searchProducts(params), listIndustriesWithCounts()]);
  const searched = Boolean(params.q || params.industry || params.state || params.city);
  const { browse: b } = await getMessages();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-primary sm:text-6xl animate-in slide-in-from-bottom-2 duration-500 ease-out">{params.q ? fill(b.resultsFor, { q: params.q }) : b.searchTitle}</h1>
      <SearchForm values={params} industries={industries} />
      <p aria-live="polite" className="text-muted-foreground">
        {total === 0 ? (searched ? b.noMatch : b.noneYet) : fill(total === 1 ? b.productOne : b.productMany, { count: total })}
      </p>
      {items.length > 0 && <ProductGrid products={items} priorityCount={4} />}
      <Pagination basePath="/search" params={{ q: params.q, industry: params.industry, state: params.state, city: params.city }} page={params.page} pageCount={pageCount} />
    </div>
  );
}
