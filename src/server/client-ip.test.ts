import { describe, expect, it } from "vitest";
import { clientIpFrom } from "./client-ip";

const h = (init: Record<string, string>) => new Headers(init);

describe("clientIpFrom", () => {
  it("uses the right-most x-forwarded-for entry (the one our proxy appended)", () => {
    expect(clientIpFrom(h({ "x-forwarded-for": "6.6.6.6, 203.0.113.4" }), "x-forwarded-for")).toBe("203.0.113.4");
  });

  it("reads single-value headers as-is", () => {
    expect(clientIpFrom(h({ "cf-connecting-ip": "2001:db8::1" }), "cf-connecting-ip")).toBe("2001:db8::1");
  });

  it("ignores other headers a client might forge", () => {
    expect(clientIpFrom(h({ "x-real-ip": "6.6.6.6" }), "cf-connecting-ip")).toBeNull();
  });

  it("returns null for missing or malformed values", () => {
    expect(clientIpFrom(h({}), "x-forwarded-for")).toBeNull();
    expect(clientIpFrom(h({ "x-forwarded-for": "1.2.3.4, not-an-ip" }), "x-forwarded-for")).toBeNull();
  });
});
