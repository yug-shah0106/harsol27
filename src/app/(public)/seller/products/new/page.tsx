import type { Metadata } from "next";
import Link from "next/link";
import { HTML_LANG, industryName } from "@/lib/i18n";
import { listActiveIndustries } from "@/server/industries";
import { getLocale, getMessages } from "@/server/locale";
import { requireSellerPage } from "../../seller-page";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Add a product", robots: { index: false } };

export default async function NewProductPage() {
  await requireSellerPage("/seller/products/new");
  const [locale, t] = [await getLocale(), await getMessages()];
  const s = t.sellerArea;
  const industries = (await listActiveIndustries())
    .map((industry) => ({ id: industry.id, name: industryName(t, industry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, HTML_LANG[locale]));
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <Link href="/seller/products" className="w-fit text-sm text-primary underline">
          {s.back}
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">{s.addProduct}</h1>
        <p className="text-muted-foreground">{s.addIntro}</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 sm:p-8">
        <ProductForm values={{ name: "", industryId: "", description: "", specifications: [] }} industries={industries} />
      </div>
    </div>
  );
}
