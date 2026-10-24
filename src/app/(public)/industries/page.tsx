import type { Metadata } from "next";
import Link from "next/link";
import { CountUp } from "@/components/motion-text";
import { HTML_LANG, industryName } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { listIndustriesWithCounts } from "@/server/catalog";
import { getLocale, getMessages } from "@/server/locale";

export const metadata: Metadata = pageMetadata({
  title: "Browse suppliers by industry",
  description: "Browse Harsol27 by industry to find approved manufacturers, wholesalers and traders from Harsol, and contact them directly.",
  path: "/industries",
  keywords: ["suppliers by industry Harsol", "Harsol industries"],
});

export default async function IndustriesPage() {
  const [locale, t] = [await getLocale(), await getMessages()];
  // In the visitor's language, A to Z in it.
  const industries = (await listIndustriesWithCounts())
    .map((industry) => ({ ...industry, name: industryName(t, industry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, HTML_LANG[locale]));
  const [count, after] = t.browse.productMany.split("{count}");
  const [countOne, afterOne] = t.browse.productOne.split("{count}");
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-primary sm:text-6xl animate-in slide-in-from-bottom-2 duration-500 ease-out">{t.browse.industriesTitle}</h1>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map((industry) => (
          <li key={industry.id} data-reveal>
            <Link
              href={`/industries/${industry.slug}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 font-semibold no-underline transition-transform duration-300 hover:-translate-y-0.5 hover:border-primary"
            >
              {industry.name}
              <span className="text-sm font-normal text-muted-foreground">
                {industry.productCount === 1 ? countOne : count}
                <CountUp value={industry.productCount} />
                {industry.productCount === 1 ? afterOne : after}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
