import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Harsol27",
  description: "Harsol27: a curated B2B marketplace.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render every page per request so each response carries a fresh CSP nonce (see src/proxy.ts).
  await connection();

  return (
    <html lang="en-IN" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
