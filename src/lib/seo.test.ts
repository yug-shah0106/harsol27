import { describe, expect, it } from "vitest";
import { clip, pageMetadata, SHARE_IMAGE, SITE_KEYWORDS } from "./seo";

describe("clip", () => {
  it("keeps short text whole and tidies its spaces", () => {
    expect(clip("  Khakhra\n from   Talod. ")).toBe("Khakhra from Talod.");
  });

  it("cuts long text at a word break, within the limit", () => {
    const text = "Crisp methi khakhra, roasted by hand in small batches, packed fresh, sold by the carton to shops, caterers and distributors across Gujarat and beyond.";
    const short = clip(text, 60);
    expect(short.length).toBeLessThanOrEqual(60);
    expect(short).toBe("Crisp methi khakhra, roasted by hand in small batches…");
  });
});

describe("pageMetadata", () => {
  it("gives a page its title, canonical address, link preview and keywords (its own first, no repeats)", () => {
    const meta = pageMetadata({ title: "Terms of use", description: "The terms.", path: "/terms", keywords: ["Harsol27 terms", "Harsol27"] });
    expect(meta.alternates?.canonical).toBe("/terms");
    expect(meta.openGraph).toMatchObject({ title: "Terms of use · Harsol27", description: "The terms.", url: "/terms", siteName: "Harsol27", images: [SHARE_IMAGE] });
    expect(meta.keywords).toEqual(["Harsol27 terms", ...SITE_KEYWORDS]);
    expect(pageMetadata({ title: { absolute: "Harsol27 · Home" }, description: "", path: "/" }).openGraph?.title).toBe("Harsol27 · Home");
  });
});
