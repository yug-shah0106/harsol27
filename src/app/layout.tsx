import type { Metadata, Viewport } from "next";
import { Fraunces, Hind_Vadodara } from "next/font/google";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { ServiceWorker } from "@/components/service-worker";
import { THEME_COOKIE } from "@/lib/preferences";
import { SHARE_IMAGE, SITE_KEYWORDS } from "@/lib/seo";
import "./globals.css";

// Self-hosted at build time by next/font: no request to Google from the visitor's browser.
// Preloading is kept small, for phones on slow networks (tests/e2e/performance.spec.ts holds LCP under 2.5s):
// Body: Hind Vadodara, which also sets Gujarati. Its Latin files are preloaded; its Gujarati files come
// second in the font stack, not preloaded, so a browser fetches them only on pages that show Gujarati.
const body = Hind_Vadodara({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
const gujarati = Hind_Vadodara({ subsets: ["gujarati"], weight: ["400", "500", "600", "700"], variable: "--font-gujarati", display: "swap", preload: false });
// Display: Fraunces, a soft serif for headings and the wordmark (globals.css turns on its soft, wonky cut).
// Not preloaded: headings show a fallback serif for a moment, then swap, rather than hold up the page.
const serif = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], axes: ["SOFT", "WONK"], variable: "--font-serif", display: "swap", preload: false });

// Per request, like every page here: the site's address (for canonical links and link previews) comes from the
// environment, which the Docker build does not have.
export function generateMetadata(): Metadata {
  const site = process.env.BETTER_AUTH_URL;
  return {
    metadataBase: site ? new URL(site) : undefined,
    title: { default: "Harsol27 · Harsol Sattavis Jain community B2B marketplace", template: "%s · Harsol27" },
    description: "Harsol27, by the Harsol Sattavis (27) Jain community: find approved manufacturers, wholesalers and traders from Gujarat and talk to the seller directly.",
    keywords: SITE_KEYWORDS,
    openGraph: { type: "website", siteName: "Harsol27", locale: "en_IN", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", images: [SHARE_IMAGE] },
    appleWebApp: { capable: true, title: "Harsol27", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = { themeColor: "#fff9ef" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render every page per request so each response carries a fresh CSP nonce (see src/proxy.ts).
  await connection();
  const dark = (await cookies()).get(THEME_COOKIE)?.value === "dark";

  return (
    <html lang="en-IN" className={`${body.variable} ${gujarati.variable} ${serif.variable} h-full antialiased${dark ? " dark" : ""}`}>
      <body className="flex min-h-svh flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
