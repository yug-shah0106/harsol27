"use client";

import { useEffect } from "react";

/** Registers the service worker (offline page, installable app). Production only; the site works without it. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/serwist/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
