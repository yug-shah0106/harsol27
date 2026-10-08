import { createSerwistRoute } from "@serwist/turbopack";

// Builds the service worker from src/app/sw.ts during `next build` and serves it at /serwist/sw.js.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
  esbuildOptions: { format: "iife", sourcemap: false }, // a classic worker: works in every browser
  // Only the offline page is saved ahead of time. Everything else loads as usual, so a first visit
  // never downloads the whole site (or the 3D library on devices that do not show it).
  globPatterns: ["public/offline.html", "public/offline.css", "public/icons/icon-192.png"],
});
