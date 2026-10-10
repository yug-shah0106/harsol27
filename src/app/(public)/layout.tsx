import { Suspense } from "react";
import { CookieNotice } from "@/components/cookie-notice";
import { FloatingActions } from "@/components/floating-actions";
import { Motion } from "@/components/motion";
import { NavigationProgress } from "@/components/navigation-progress";
import { SiteFooter, SiteHeader, SkipLink } from "@/components/site-header";
import { UtmCapture } from "@/components/utm-capture";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <SiteHeader />
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
