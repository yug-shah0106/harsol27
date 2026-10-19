import type { Metadata } from "next";

/**
 * What people search for, on every public page, in English and Gujarati. Google ignores the keywords tag
 * (Bing gives it little weight); the title, the description and the page's own words do the work.
 */
export const SITE_KEYWORDS = [
  "Harsol27",
  "B2B marketplace Gujarat",
  "Gujarat manufacturers",
  "Gujarat wholesalers",
  "Gujarat traders",
  "Gujarat suppliers",
  "Gujarati business directory",
  "B2B directory India",
  "Harsol Sattavis Jain",
  "Harsol 27 Jain community",
  "Shree Harsol Sattavis Jain Yuvak Trust",
  "Jain business directory",
  "હરસોલ સત્તાવીસ જૈન સમાજ",
  "હરસોલ સત્તાવીસ જૈન યુવક ટ્રસ્ટ",
  "ગુજરાતી વેપારી",
  "જથ્થાબંધ વેપાર ગુજરાત",
];

/**
 * The picture a shared link shows (WhatsApp, Facebook, X): the trust's logo, the wordmark and who it is by,
 * on the Marigold cream with the toran. 1200×630, in public/.
 */
export const SHARE_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Harsol27, by the Harsol Sattavis (27) Jain community: the B2B marketplace for Gujarat's manufacturers, wholesalers and traders",
};

/** Shortens text to `max` characters or fewer, at a word break, so search results show it whole. */
export function clip(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const end = cut.lastIndexOf(" ");
  return `${(end > 0 ? cut.slice(0, end) : cut).replace(/[\s,.;:-]+$/, "")}…`;
}

/**
 * A public page's details for search engines and link previews (WhatsApp, Facebook): its title (a string
 * gets " · Harsol27" from the root layout), description, keywords (the page's own, then the site's), and
 * its one address (canonical: "/" and "/coming-soon", or ?page=2, count as the same page).
 */
export function pageMetadata({ title, description, path, keywords = [] }: { title: string | { absolute: string }; description: string; path: string; keywords?: string[] }): Metadata {
  return {
    title,
    description,
    keywords: [...new Set([...keywords, ...SITE_KEYWORDS])],
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "Harsol27", locale: "en_IN", url: path, title: typeof title === "string" ? `${title} · Harsol27` : title.absolute, description, images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", images: [SHARE_IMAGE] },
  };
}
