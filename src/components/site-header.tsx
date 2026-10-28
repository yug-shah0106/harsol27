import { cookies } from "next/headers";
import Link from "next/link";
import { cn } from "cn";
import { InstallApp } from "@/components/install-app";
import { LanguageSwitcher } from "@/components/language";
import { MobileMenu } from "@/components/mobile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { THEME_COOKIE } from "@/lib/preferences";
import { getMember, SELLER_HOME_PATH } from "@/server/authz";
import { getMessages } from "@/server/locale";
import { sellerLoginName } from "@/server/sellers";

/** "Vansh Shah" → "VS"; one name → its first letter. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

/** `label`: in the visitor's language on public pages; the admin's stays English. */
export function SkipLink({ label = "Skip to main content" }: { label?: string }) {
  return (
    <a
      href="#main"
      className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground print:hidden focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      {label}
    </a>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="inline-flex min-w-0 items-center gap-1.5 text-primary no-underline min-[360px]:gap-2">
      {/* The Harsol Sattavis Jain Yuvak Trust's logo, the larger of the two (decorative: the name beside it names the link).
          52px, reaching into the header's padding (negative margin) so the header stays 65px tall; 44px under
          360px, where it and "Register" only just fit. A plain <img>: next/image adds an inline style our CSP blocks. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.webp" alt="" width={58} height={52} className="-my-0.5 h-11 w-auto shrink-0 min-[360px]:-my-1.5 min-[360px]:h-13" />
      {/* The trust's name in two lines, no taller than the header's button (40px): "Shree" small (like the line
          beneath) before "Harsol27" in the serif, then "Jain Yuvak Trust, Bhayander" small beneath (wrapping onto a
          second line on narrow phones). */}
      <span className="flex min-w-0 flex-col sm:gap-0.5">
        <span className="font-display text-lg leading-none tracking-tight whitespace-nowrap sm:text-[1.375rem]">
          <span className="font-sans text-[0.625rem] font-semibold tracking-normal text-muted-foreground sm:text-xs">Shree </span>
          Harsol<span className="italic">27</span>
        </span>
        <span className="text-[0.625rem] leading-[1.1] font-semibold text-muted-foreground sm:text-xs sm:whitespace-nowrap">Jain Yuvak Trust, Bhayander</span>
      </span>
    </Link>
  );
}

/**
 * Sticky: stays at the top (translucent) while the page scrolls under it, with a reading-progress line beneath.
 * `blend` (the public pages): clear over the page at the top, frosting into a cream bar as you scroll.
 */
export async function SiteHeader({ blend = false }: { blend?: boolean }) {
  const member = await getMember();
  // A signed-in seller (2026-10-27): "Home" opens their dashboard, and their profile replaces "Seller registration".
  const sellerName = member && (await sellerLoginName(member.id));
  const t = await getMessages();
  const dark = (await cookies()).get(THEME_COOKIE)?.value === "dark";
  const account = member ? { href: "/account", label: t.nav.account } : { href: "/sign-in", label: t.nav.signIn };
  const links = [{ href: sellerName ? SELLER_HOME_PATH : "/", label: t.nav.home }, { href: "/search", label: t.nav.search }, { href: "/about", label: t.nav.about }, account];
  return (
    <header className={cn("sticky top-0 z-40 border-b border-border backdrop-blur-md print:static print:border-0", blend ? "header-blend bg-background/85" : "bg-card/85")}>
      {/* Full width: the wordmark in the left corner, the links and "Seller registration" in the right (same gutters as the
          footer). Below 1024px the links, language and dark mode move into the menu. */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 lg:px-10">
        <Wordmark />
        <div className="flex items-center gap-1 print:hidden sm:gap-3">
          <nav aria-label={t.nav.main} className="hidden items-center gap-3 lg:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-md px-2 py-2 text-sm font-medium whitespace-nowrap hover:text-primary hover:underline">
                {link.label}
              </Link>
            ))}
            <LanguageSwitcher id="language" />
            <ThemeToggle initialDark={dark} />
          </nav>
          {sellerName ? (
            // Initials in a circle, as in the admin header, then the name (only the circle on phones).
            <Link href={SELLER_HOME_PATH} title={t.nav.dashboard} className="flex items-center gap-2 rounded-full py-1 pr-1 no-underline hover:text-primary sm:pr-3">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initials(sellerName)}
              </span>
              <span className="sr-only max-w-32 truncate text-sm font-semibold sm:not-sr-only">{sellerName}</span>
            </Link>
          ) : (
            <Button asChild className="rounded-full">
              <Link href="/Seller-Registration">
                {/* Short on phones, where the header is tight. */}
                <span className="sm:hidden">{t.nav.register}</span>
                <span className="hidden sm:inline">{t.nav.sellerRegistration}</span>
              </Link>
            </Button>
          )}
          <MobileMenu links={links} initialDark={dark} />
        </div>
      </div>
      <span aria-hidden="true" className="scroll-progress absolute inset-x-0 -bottom-px h-0.5 bg-primary print:hidden" />
    </header>
  );
}

export async function SiteFooter() {
  const t = await getMessages();
  return (
    <footer className="mt-auto border-t border-border bg-secondary print:hidden">
      {/* One slim row: the copyright left, the links right (the floating buttons stop above the footer). */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 text-sm sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="text-muted-foreground">© {new Date().getFullYear()} {t.footer.owner}</p>
          <InstallApp />
        </div>
        <nav aria-label={t.footer.label} className="ml-auto flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/about" className="hover:underline">{t.footer.about}</Link>
          <Link href="/about#faq" className="hover:underline">{t.footer.faq}</Link>
          <Link href="/seller/sign-in" className="hover:underline">{t.footer.sellerSignIn}</Link>
          <Link href="/contact" className="hover:underline">{t.footer.contact}</Link>
          <Link href="/terms" className="hover:underline">{t.footer.terms}</Link>
          <Link href="/privacy" className="hover:underline">{t.footer.privacy}</Link>
        </nav>
      </div>
    </footer>
  );
}
