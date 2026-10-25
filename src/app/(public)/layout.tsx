import { Suspense } from "react";
import { CookieNotice } from "@/components/cookie-notice";
import { Toran } from "@/components/festive";
import { FloatingActions } from "@/components/floating-actions";
import { LocaleRoot } from "@/components/locale-root";
import { Motion } from "@/components/motion";
import { NavigationProgress } from "@/components/navigation-progress";
import { SiteFooter, SiteHeader, SkipLink } from "@/components/site-header";
import { UtmCapture } from "@/components/utm-capture";
import { isComingSoon } from "@/lib/coming-soon";
import { getMessages } from "@/server/locale";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = await getMessages();
  return (
    <LocaleRoot>
      <SkipLink label={t.nav.skip} />
      <Toran />
      {/* Before launch, these pages wear the coming-soon page's header: clear at the top, frosting as you scroll. */}
      <SiteHeader blend={isComingSoon()} />
      <main id="main" className="flex-1 outline-none">
        {children}
        <FloatingActions />
      </main>
      <SiteFooter />
      <CookieNotice />
      <UtmCapture />
      <Suspense fallback={null}>
        <Motion />
        <NavigationProgress />
      </Suspense>
    </LocaleRoot>
  );
}
