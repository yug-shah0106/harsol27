import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/pagination";
import { ProductGrid } from "@/components/product-card";
import { SearchForm } from "@/components/search-form";
import { fill, industryName } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { getActiveIndustryBySlug, searchParamsSchema, searchProducts } from "@/server/catalog";
import { getMessages } from "@/server/locale";

export async function generateMetadata({ params }: PageProps<"/industries/[slug]">): Promise<Metadata> {
  const industry = await getActiveIndustryBySlug((await params).slug);
  if (!industry) return {};
  const { name } = industry;
  return pageMetadata({
    title: `${name} suppliers in Harsol`,
    description: `Find approved ${name} manufacturers, wholesalers and traders from Harsol on Harsol27. Send an enquiry and talk to the seller directly.`,
    path: `/industries/${industry.slug}`,
    keywords: [`${name} suppliers Harsol`, `${name} manufacturers Harsol`, `${name} wholesalers Harsol`, name],
  });
}

export default async function IndustryPage({ params, searchParams }: PageProps<"/industries/[slug]">) {
  const industry = await getActiveIndustryBySlug((await params).slug);
  if (!industry) notFound();
  const search = { ...searchParamsSchema.parse(await searchParams), industry: industry.slug };
  const { items, total, pageCount } = await searchProducts(search);
  const t = await getMessages();
  const b = t.browse;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <Link href="/industries" className="w-fit text-sm text-primary underline">
          {b.allIndustries}
        </Link>
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-primary sm:text-6xl animate-in slide-in-from-bottom-2 duration-500 ease-out">{industryName(t, industry.name)}</h1>
      </div>
      <SearchForm values={search} action={`/industries/${industry.slug}`} />
      <p aria-live="polite" className="text-muted-foreground">
        {total === 0 ? b.industryEmpty : fill(total === 1 ? b.productOne : b.productMany, { count: total })}
      </p>
      {items.length > 0 && <ProductGrid products={items} priorityCount={4} />}
      <Pagination basePath={`/industries/${industry.slug}`} params={{ q: search.q, state: search.state, city: search.city }} page={search.page} pageCount={pageCount} />
    </div>
  );
}
