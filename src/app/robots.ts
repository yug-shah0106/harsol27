import type { MetadataRoute } from "next";
import { baseEnv } from "@/server/env";

// Per request: the site URL comes from the environment, which does not exist at build time.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const origin = baseEnv().BETTER_AUTH_URL;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/seller", "/sign-in", "/staff", "/api", "/search"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
