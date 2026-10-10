import { Suspense } from "react";
import { Motion } from "@/components/motion";
import { SiteFooter, SiteHeader, SkipLink } from "@/components/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <Suspense fallback={null}>
        <Motion />
      </Suspense>
    </>
  );
}
