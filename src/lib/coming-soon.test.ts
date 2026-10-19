import { afterEach, describe, expect, it, vi } from "vitest";
import { comingSoonRoute } from "./coming-soon";

afterEach(() => vi.unstubAllEnvs());

describe("comingSoonRoute", () => {
  it("shows the coming-soon page at / and sends every feature page there", () => {
    vi.stubEnv("COMING_SOON", "");
    expect(comingSoonRoute("/")).toBe("rewrite");
    for (const path of ["/search", "/about", "/sign-in", "/sign-up", "/seller/products", "/products/x.y", "/administrator"]) {
      expect(comingSoonRoute(path), path).toBe("redirect");
    }
  });

  it("keeps Pre-registration, the legal pages, the staff area and files open", () => {
    vi.stubEnv("COMING_SOON", "true");
    for (const path of ["/Pre-Registration", "/privacy", "/terms", "/staff/sign-in", "/admin", "/admin/leads/1", "/media/a/b.webp", "/serwist/sw.js", "/icon.svg", "/robots.txt", "/coming-soon"]) {
      expect(comingSoonRoute(path), path).toBeNull();
    }
  });

  it("opens everything when COMING_SOON=false", () => {
    vi.stubEnv("COMING_SOON", "false");
    for (const path of ["/", "/search", "/Pre-Registration"]) expect(comingSoonRoute(path)).toBeNull();
  });
});
