import type { MetadataRoute } from "next";
import { listIndustriesWithCounts, listPublicSlugs } from "@/server/catalog";
import { baseEnv } from "@/server/env";

export const dynamic = "force-dynamic";

/** Public pages only: every visible product and seller, and every active industry. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = baseEnv().BETTER_AUTH_URL;
  const [{ products, sellers }, industries] = await Promise.all([listPublicSlugs(), listIndustriesWithCounts()]);
  return [
    { url: origin },
    { url: `${origin}/industries` },
    { url: `${origin}/about` },
    { url: `${origin}/get-started` },
    ...industries.map((i) => ({ url: `${origin}/industries/${i.slug}` })),
    ...sellers.map((s) => ({ url: `${origin}/sellers/${s.slug}`, lastModified: s.updatedAt })),
    ...products.map((p) => ({ url: `${origin}/products/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
