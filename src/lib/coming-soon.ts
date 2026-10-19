/**
 * Before launch, visitors see only the coming-soon page. Every feature is still built and kept
 * (nothing is removed): set COMING_SOON=false to open the full site. On unless set to "false".
 */
export const isComingSoon = () => process.env.COMING_SOON !== "false";

// Still open while the site is closed: the Pre-registration form (the Get started form after launch), the legal
// pages, and the staff area (sign-in, admin and the files it shows).
const OPEN = ["/coming-soon", "/Pre-Registration", "/privacy", "/terms", "/staff", "/admin", "/media", "/serwist"];

/** While closed: "/" shows the coming-soon page, other pages send visitors to "/", files load as usual. */
export function comingSoonRoute(pathname: string): "rewrite" | "redirect" | null {
  if (!isComingSoon()) return null;
  if (pathname === "/") return "rewrite";
  if (/^\/[^/]+\.\w+$/.test(pathname)) return null; // top-level files: icons, manifest, robots.txt, sitemap.xml, offline page
  return OPEN.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ? null : "redirect";
}
