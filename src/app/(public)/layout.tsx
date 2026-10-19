import { Suspense } from "react";
import { CookieNotice } from "@/components/cookie-notice";
import { Toran } from "@/components/festive";
import { FloatingActions } from "@/components/floating-actions";
import { Motion } from "@/components/motion";
import { NavigationProgress } from "@/components/navigation-progress";
import { SiteFooter, SiteHeader, SkipLink } from "@/components/site-header";
import { UtmCapture } from "@/components/utm-capture";
import { isComingSoon } from "@/lib/coming-soon";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <Toran />
      {/* Before launch, these pages wear the coming-soon page's header: clear at the top, frosting as you scroll. */}
      <SiteHeader blend={isComingSoon()} />
      <main id="main" className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter />
      <FloatingActions />
      <CookieNotice />
      <UtmCapture />
      <Suspense fallback={null}>
        <Motion />
        <NavigationProgress />
      </Suspense>
    </>
  );
}
