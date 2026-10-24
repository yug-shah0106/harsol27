import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader, SkipLink } from "@/components/site-header";
import { LocaleRoot } from "@/components/locale-root";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/server/locale";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** Every missing page, and every page someone may not see (hidden listings look the same as missing ones). */
export default async function NotFound() {
  const t = await getMessages();
  return (
    <LocaleRoot>
      <SkipLink label={t.nav.skip} />
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start gap-4 px-4 py-20 sm:px-6">
        <p className="text-sm font-semibold text-muted-foreground">{t.notFound.kicker}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{t.notFound.title}</h1>
        <p className="text-muted-foreground">{t.notFound.body}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/search">{t.notFound.search}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">{t.notFound.home}</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </LocaleRoot>
  );
}
