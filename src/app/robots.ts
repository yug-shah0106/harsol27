import type { MetadataRoute } from "next";
import { baseEnv } from "@/server/env";

// Per request: the site URL comes from the environment, which does not exist at build time.
export const dynamic = "force-dynamic";

// "/seller/" with the slash: a bare "/seller" would also block the public seller profiles at /sellers/….
// The seller dashboard at /seller itself is marked noindex.
export default function robots(): MetadataRoute.Robots {
  const origin = baseEnv().BETTER_AUTH_URL;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/seller/", "/sign-in", "/forgot-password", "/reset-password", "/staff", "/api", "/search"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
