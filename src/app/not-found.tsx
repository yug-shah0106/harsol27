import type { Metadata } from "next";
import { Toran } from "@/components/festive";
import { LocaleRoot } from "@/components/locale-root";
import { NotFoundBody } from "@/components/not-found-body";
import { SiteFooter, SiteHeader, SkipLink } from "@/components/site-header";
import { getMessages } from "@/server/locale";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/**
 * An address no page matches: nothing else draws the site's header here. A page that calls notFound() gets the
 * not-found.tsx of its own section instead ((public)/ and admin/), inside that section's layout.
 */
export default async function NotFound() {
  const t = await getMessages();
  return (
    <LocaleRoot>
      <SkipLink label={t.nav.skip} />
      <Toran />
      <SiteHeader blend />
      <main id="main" className="flex-1 outline-none">
        <NotFoundBody />
      </main>
      <SiteFooter />
    </LocaleRoot>
  );
}
