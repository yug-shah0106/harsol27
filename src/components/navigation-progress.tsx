"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * A thin bar along the top of the window while the next page loads (after a link click or a GET form
 * such as search). It stops by itself when the address changes. Pages are not streamed behind a
 * loading screen, so a missing page still answers 404 and a redirect is still a real redirect.
 */
export function NavigationProgress() {
  const here = `${usePathname()}?${useSearchParams()}`;
  const [leaving, setLeaving] = useState<string | null>(null); // the address we started leaving

  useEffect(() => {
    const start = (url: URL) => {
      const next = `${url.pathname}?${url.searchParams}`;
      if (url.origin === location.origin && next !== here) setLeaving(here);
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (link instanceof HTMLAnchorElement && !link.target && !link.hasAttribute("download")) start(new URL(link.href));
    };
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      if (!event.defaultPrevented && form.method === "get") start(new URL(form.action));
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, [here]);

  if (leaving !== here) return null;
  return (
    <div role="progressbar" aria-label="Loading the page" className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden print:hidden">
      <div className="nav-progress h-full w-1/3 bg-primary" />
    </div>
  );
}
