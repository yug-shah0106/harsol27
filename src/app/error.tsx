"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Shown when a page fails unexpectedly. Never shows the error itself (the server logs it); the
 * reference lets the team find the log entry.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start gap-4 px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground">
        Please try again. If it keeps happening, contact the Harsol27 team{error.digest ? ` and mention reference ${error.digest}` : ""}.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Go to the home page</Link>
        </Button>
      </div>
    </main>
  );
}
