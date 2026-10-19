"use client";

import { useEffect } from "react";

/**
 * Reloading the page starts it at the top again, not where the visitor had scrolled to (the browser's
 * default). For landing pages (coming soon), which are meant to be seen from the start. A link to a
 * #section still goes there. The browser's own setting comes back when the page is left.
 */
export function StartAtTop() {
  useEffect(() => {
    const before = history.scrollRestoration;
    history.scrollRestoration = "manual";
    if (!location.hash) window.scrollTo(0, 0);
    return () => {
      history.scrollRestoration = before;
    };
  }, []);
  return null;
}
