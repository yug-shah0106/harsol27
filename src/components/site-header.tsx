import { cookies } from "next/headers";
import Link from "next/link";
import { InstallApp } from "@/components/install-app";
import { MobileMenu } from "@/components/mobile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { THEME_COOKIE } from "@/lib/preferences";
import { getMember } from "@/server/authz";

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground print:hidden focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Skip to main content
    </a>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="font-display text-2xl leading-none tracking-tight text-primary no-underline sm:text-[1.7rem]">
      Harsol<span className="text-foreground italic">27</span>
    </Link>
  );
}

/** Sticky: stays at the top (translucent) while the page scrolls under it, with a reading-progress line beneath. */
export async function SiteHeader() {
  const member = await getMember();
  const dark = (await cookies()).get(THEME_COOKIE)?.value === "dark";
  const links = [
    { href: "/search", label: "Search" },
    { href: "/about", label: "About" },
    member ? { href: "/account", label: "Your account" } : { href: "/sign-in", label: "Sign in" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur-md print:static print:border-0">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <Wordmark />
        <div className="flex items-center gap-1 print:hidden sm:gap-3">
          <nav aria-label="Main" className="hidden items-center gap-1 sm:flex sm:gap-3">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-md px-2 py-2 text-sm font-medium whitespace-nowrap hover:text-primary hover:underline">
                {link.label}
              </Link>
            ))}
            <ThemeToggle initialDark={dark} />
          </nav>
          <Button asChild data-magnet className="rounded-full">
            <Link href="/get-started">Get started</Link>
          </Button>
          <MobileMenu links={links} initialDark={dark} />
        </div>
      </div>
      <span aria-hidden="true" className="scroll-progress absolute inset-x-0 -bottom-px h-0.5 bg-primary print:hidden" />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-secondary print:hidden">
      {/* Bottom padding keeps the links clear of the floating buttons. */}
      <div className="flex flex-col gap-4 px-4 pt-8 pb-24 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground">© {new Date().getFullYear()} Harsol27</p>
          <InstallApp />
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/about#faq" className="hover:underline">FAQ</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
