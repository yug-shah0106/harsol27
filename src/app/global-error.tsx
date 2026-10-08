"use client";

import "./globals.css";

/** Last resort, when even the page frame fails: plain, no details. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body className="flex min-h-full flex-col items-start gap-4 px-6 py-20">
        <h1 className="text-3xl font-extrabold tracking-tight">Something went wrong</h1>
        <p>Please try again in a moment.{error.digest ? ` Reference: ${error.digest}` : ""}</p>
        <button type="button" onClick={reset} className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground">
          Try again
        </button>
      </body>
    </html>
  );
}
