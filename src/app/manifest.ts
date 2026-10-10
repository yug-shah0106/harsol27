import type { MetadataRoute } from "next";

/** Makes the site installable as an app (Android, desktop Chrome/Edge; iPhone via Share → Add to Home Screen). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Harsol27 · B2B marketplace for Gujarat",
    short_name: "Harsol27",
    description: "Find approved Gujarati manufacturers, wholesalers and traders, and talk to them directly.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#faf7f2",
    lang: "en-IN",
    categories: ["business", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Search products", url: "/search" },
      { name: "Your seller account", url: "/seller" },
    ],
  };
}
