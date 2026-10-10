import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import { connection } from "next/server";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

// Self-hosted at build time by next/font: no request to Google from the visitor's browser.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
// Elegant serif for big headings and the wordmark (one weight; italics for emphasis).
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Harsol27 · B2B marketplace for Gujarat's businesses", template: "%s · Harsol27" },
  description: "Find approved Gujarati manufacturers, wholesalers and traders, and talk to them directly.",
  appleWebApp: { capable: true, title: "Harsol27", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#faf7f2" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render every page per request so each response carries a fresh CSP nonce (see src/proxy.ts).
  await connection();

  return (
    <html lang="en-IN" className={`${jakarta.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-svh flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
