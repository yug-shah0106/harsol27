import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader, SkipLink } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** Every missing page, and every page someone may not see (hidden listings look the same as missing ones). */
export default function NotFound() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start gap-4 px-4 py-20 sm:px-6">
        <p className="text-sm font-semibold text-muted-foreground">Error 404</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground">This page does not exist, or it is no longer available. A listing may have been hidden by its seller.</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/search">Search products</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go to the home page</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
