import type { Metadata } from "next";
import Link from "next/link";
import { CountUp } from "@/components/motion-text";
import { listIndustriesWithCounts } from "@/server/catalog";

export const metadata: Metadata = { title: "Browse by industry", description: "Gujarat's manufacturers, wholesalers and traders, by industry." };

export default async function IndustriesPage() {
  const industries = await listIndustriesWithCounts();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-primary sm:text-6xl animate-in slide-in-from-bottom-2 duration-500 ease-out">Browse by industry</h1>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map((industry) => (
          <li key={industry.id} data-reveal>
            <Link
              href={`/industries/${industry.slug}`}
              data-spotlight
              className="spotlight flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 font-semibold no-underline transition-transform duration-300 hover:-translate-y-0.5 hover:border-primary"
            >
              {industry.name}
              <span className="text-sm font-normal text-muted-foreground">
                <CountUp value={industry.productCount} /> {industry.productCount === 1 ? "product" : "products"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
