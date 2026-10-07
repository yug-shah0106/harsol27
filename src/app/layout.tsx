import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

// Self-hosted at build time by next/font: no request to Google from the visitor's browser.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Harsol27 · B2B marketplace for Gujarat's businesses", template: "%s · Harsol27" },
  description: "Find approved Gujarati manufacturers, wholesalers and traders, and talk to them directly.",
};

export const viewport: Viewport = { themeColor: "#1f3a68" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render every page per request so each response carries a fresh CSP nonce (see src/proxy.ts).
  await connection();

  return (
    <html lang="en-IN" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
