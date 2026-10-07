import { describe, expect, it } from "vitest";
import { fieldErrors, leadSchema } from "./lead-schema";

const valid = {
  fullName: "  Asha Patel ",
  phone: "98765 43210",
  email: " Asha@Example.COM ",
  businessCategory: "MANUFACTURING",
  industryId: "0199b5c0-0000-7000-8000-000000000001",
};

describe("leadSchema", () => {
  it("normalises name, India-default phone to E.164 and lowercases email", () => {
    expect(leadSchema.parse(valid)).toEqual({
      fullName: "Asha Patel",
      phone: "+919876543210",
      email: "asha@example.com",
      businessCategory: "MANUFACTURING",
      industryId: valid.industryId,
    });
  });

  it("accepts other countries when a country code is given", () => {
    expect(leadSchema.parse({ ...valid, phone: "+44 20 7946 0958" }).phone).toBe("+442079460958");
  });

  it.each([
    ["fullName", ""],
    ["fullName", "Asha\nBcc: x@evil.test"],
    ["phone", ""],
    ["phone", "12345"],
    ["phone", "not a phone"],
    ["email", "asha@"],
    ["businessCategory", "FARMING"],
    ["industryId", "steel"],
  ])("rejects %s = %j with a message for that field", (field, value) => {
    const result = leadSchema.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)[field]).toBeTruthy();
  });

  it("requires every field", () => {
    const result = leadSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(
        ["businessCategory", "email", "fullName", "industryId", "phone"].sort(),
      );
    }
  });
});
