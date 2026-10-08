/// <reference lib="webworker" />
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

// The service worker (built by app/serwist/[path]/route.ts, served at /serwist/sw.js).
// It keeps only the offline page and its stylesheet and icon. It never stores a page: every page
// is fetched fresh, so nothing personal (accounts, seller or admin pages) is ever kept on the
// device. When a page cannot load because there is no connection, the offline page is shown.

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: true, // a new version takes over at once: nothing cached can go stale
  clientsClaim: true,
  runtimeCaching: [{ matcher: ({ request }) => request.mode === "navigate", handler: new NetworkOnly() }],
  fallbacks: { entries: [{ url: "/offline.html", matcher: ({ request }) => request.destination === "document" }] },
});

serwist.addEventListeners();
