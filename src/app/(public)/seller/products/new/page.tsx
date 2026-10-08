import type { Metadata } from "next";
import Link from "next/link";
import { listActiveIndustries } from "@/server/industries";
import { requireSellerPage } from "../../seller-page";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Add a product", robots: { index: false } };

export default async function NewProductPage() {
  await requireSellerPage("/seller/products/new");
  const industries = await listActiveIndustries();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <Link href="/seller/products" className="w-fit text-sm text-primary underline">
          ← Your products
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">Add a product</h1>
        <p className="text-muted-foreground">Add the details first; you can add photos on the next screen.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 sm:p-8">
        <ProductForm values={{ name: "", industryId: "", description: "", specifications: [] }} industries={industries} />
      </div>
    </div>
  );
}
