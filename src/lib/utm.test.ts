import { describe, expect, it } from "vitest";
import { parseUtm, pickUtm } from "./utm";

describe("campaign tags", () => {
  it("keeps only the known tags, trimmed and capped", () => {
    const query = new URLSearchParams(`utm_source=%20newsletter%20&utm_campaign=${"d".repeat(150)}&utm_x=1&q=khakhra`);
    expect(pickUtm((k) => query.get(k))).toEqual({ utm_source: "newsletter", utm_campaign: "d".repeat(100) });
    expect(pickUtm((k) => new URLSearchParams("q=khakhra").get(k))).toBeNull();
  });

  it("reads what the form sent, and treats anything malformed as no tags", () => {
    expect(parseUtm(JSON.stringify({ utm_medium: "whatsapp", other: "x" }))).toEqual({ utm_medium: "whatsapp" });
    for (const bad of ["", "not json", "null", "[1]", '{"utm_source":5}', undefined, "x".repeat(2001)]) expect(parseUtm(bad)).toBeNull();
  });
});
