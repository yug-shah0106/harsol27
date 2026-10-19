import { describe, expect, it } from "vitest";
import { feeOn, rupees } from "./fee";

describe("feeOn", () => {
  it("is the ₹500 offer up to and including 24 November 2026, then ₹1,000", () => {
    expect(feeOn("2026-10-17")).toEqual({ amount: 500, regular: 1000, months: 15, offerLastDay: "2026-11-24" });
    expect(feeOn("2026-11-24").amount).toBe(500);
    expect(feeOn("2026-11-25")).toEqual({ amount: 1000, regular: 1000, months: 15, offerLastDay: null });
  });

  it("formats rupees the Indian way", () => {
    expect(rupees(1000)).toBe("₹1,000");
    expect(rupees(100000)).toBe("₹1,00,000");
  });
});
