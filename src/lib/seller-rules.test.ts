import { describe, expect, it } from "vitest";
import { detectDocumentType } from "./file-type";
import { safeReturnPath } from "./return-path";
import { decisionsFor, SELLER_DECISIONS, type SellerStatusValue } from "./seller-status";

describe("seller decisions", () => {
  it.each<[SellerStatusValue, string[]]>([
    ["PENDING", ["approve", "reject"]],
    ["APPROVED", ["suspend"]],
    ["SUSPENDED", ["reinstate"]],
    ["REJECTED", []], // only the seller can move on, by applying again
  ])("a %s seller can be given exactly %j", (status, expected) => {
    expect(decisionsFor(status)).toEqual(expected);
  });

  it("requires a reason for reject and suspend only", () => {
    expect(Object.entries(SELLER_DECISIONS).filter(([, d]) => d.needsReason).map(([n]) => n)).toEqual(["reject", "suspend"]);
  });
});

describe("detectDocumentType", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0, 0, 0, 0, 0]);
  it("recognises PDF, JPEG and PNG by their first bytes", () => {
    expect(detectDocumentType(new TextEncoder().encode("%PDF-1.7\n"))).toBe("application/pdf");
    expect(detectDocumentType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectDocumentType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
  });

  it("refuses anything else, whatever its name or declared type", () => {
    expect(detectDocumentType(new TextEncoder().encode("MZ\x90\x00 executable"))).toBeNull();
    expect(detectDocumentType(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(detectDocumentType(new Uint8Array())).toBeNull();
  });
});

describe("safeReturnPath", () => {
  it.each(["/account", "/seller/apply", "/admin/leads?status=NEW"])("keeps same-site path %s", (p) => {
    expect(safeReturnPath(p)).toBe(p);
  });

  it.each(["//evil.example", "https://evil.example", "/\\evil.example", "javascript:alert(1)", "", undefined, 42, "/a b"])(
    "replaces %j with the fallback",
    (p) => {
      expect(safeReturnPath(p)).toBe("/account");
    },
  );
});
