import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Skip to main content
    </a>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="text-xl font-extrabold tracking-tight text-primary no-underline">
      Harsol<span className="text-foreground">27</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Wordmark />
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-4">
          <Link href="/about" className="rounded-md px-2 py-2 text-sm font-medium hover:underline">
            About
          </Link>
          <Button asChild>
            <Link href="/get-started">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-muted-foreground">© {new Date().getFullYear()} Harsol27</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
