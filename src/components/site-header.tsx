import { cookies } from "next/headers";
import Link from "next/link";
import { cn } from "cn";
import { InstallApp } from "@/components/install-app";
import { MobileMenu } from "@/components/mobile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { isComingSoon } from "@/lib/coming-soon";
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
    <Link href="/" className="inline-flex items-center gap-1.5 font-display text-lg leading-none tracking-tight text-primary no-underline min-[360px]:gap-2 min-[360px]:text-xl sm:text-[1.375rem]">
      {/* The Harsol Sattavis Jain Yuvak Trust's logo, the larger of the two (decorative: the wordmark names the link).
          52px, reaching into the header's padding (negative margin) so the header stays 65px tall; 44px under
          360px, where it and "Pre-register" only just fit. A plain <img>: next/image adds an inline style our CSP blocks. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.webp" alt="" width={58} height={52} className="-my-0.5 h-11 w-auto shrink-0 min-[360px]:-my-1.5 min-[360px]:h-13" />
      <span>
        Harsol<span className="italic">27</span>
      </span>
    </Link>
  );
}

/**
 * Sticky: stays at the top (translucent) while the page scrolls under it, with a reading-progress line beneath.
 * `blend` (the coming-soon page): clear over the page at the top, frosting into a cream bar as you scroll.
 */
export async function SiteHeader({ blend = false }: { blend?: boolean }) {
  // Before launch only Home and Pre-registration are open (src/lib/coming-soon.ts), so only they are linked.
  const closed = isComingSoon();
  const member = closed ? null : await getMember();
  const dark = (await cookies()).get(THEME_COOKIE)?.value === "dark";
  const links = closed
    ? [{ href: "/", label: "Home" }]
    : [
        { href: "/", label: "Home" },
        { href: "/search", label: "Search" },
        { href: "/about", label: "About" },
        member ? { href: "/account", label: "Your account" } : { href: "/sign-in", label: "Sign in" },
      ];
  return (
    <header className={cn("sticky top-0 z-40 border-b border-border backdrop-blur-md print:static print:border-0", blend ? "header-blend bg-background/85" : "bg-card/85")}>
      {/* Full width: the wordmark in the left corner, the links and "Get started" in the right (same gutters as the footer). */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 lg:px-10">
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
          <Button asChild data-magnet={!closed || undefined} className="rounded-full">
            <Link href="/Pre-Registration">{closed ? "Pre-register" : "Get started"}</Link>
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
      {/* One slim row, all on the left: the floating buttons sit bottom-right. Phones keep room under it for them. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-5 pb-24 text-sm sm:px-6 sm:pb-5 lg:px-10">
        <p className="text-muted-foreground">© {new Date().getFullYear()} Harsol27</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {!isComingSoon() && (
            <>
              <Link href="/about" className="hover:underline">About</Link>
              <Link href="/about#faq" className="hover:underline">FAQ</Link>
            </>
          )}
          <Link href="/terms" className="hover:underline">Terms</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
        </nav>
        <InstallApp />
      </div>
    </footer>
  );
}
