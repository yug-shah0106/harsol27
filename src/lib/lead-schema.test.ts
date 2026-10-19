import { describe, expect, it } from "vitest";
import { fieldErrors, leadIndustryName, leadSchema, OTHER_INDUSTRY, OTHER_NATIVE_PLACE, suggestUsername, usernameSchema } from "./lead-schema";

const valid = {
  firstName: "  Asha ",
  fatherName: " Ramesh ",
  lastName: " Patel",
  nativePlace: "Harsol",
  address: "12 Station Road",
  city: "Talod",
  state: "Gujarat",
  pincode: "383 215",
  phone: "98765 43210",
  email: " Asha@Example.COM ",
  businessCategory: "MANUFACTURING",
  industryIds: ["0199b5c0-0000-7000-8000-000000000001"],
  paymentProof: "lead-payments/0199b5c0-0000-7000-8000-000000000009.png",
};

describe("leadSchema", () => {
  it("trims the name's parts, joins the pincode, India-default phone to E.164 and lowercases email", () => {
    expect(leadSchema.parse(valid)).toEqual({
      firstName: "Asha",
      fatherName: "Ramesh",
      lastName: "Patel",
      nativePlace: "Harsol",
      address: "12 Station Road",
      city: "Talod",
      state: "Gujarat",
      pincode: "383215",
      phone: "+919876543210",
      email: "asha@example.com",
      businessCategory: "MANUFACTURING",
      industryIds: valid.industryIds,
      nativePlaceOther: "",
      industryOther: "",
      website: "",
      mapsLink: "",
      instagram: "",
      paymentProof: valid.paymentProof,
    });
  });

  it("'Other' needs the visitor's own words for their industry", () => {
    expect(leadSchema.parse({ ...valid, industryIds: [OTHER_INDUSTRY], industryOther: "  Solar panels " }).industryOther).toBe("Solar panels");
    for (const industryOther of [undefined, "", " x "]) {
      const result = leadSchema.safeParse({ ...valid, industryIds: [OTHER_INDUSTRY], industryOther });
      expect(result.success).toBe(false);
      if (!result.success) expect(fieldErrors(result.error).industryOther).toBe("Tell us your industry.");
    }
    expect(leadSchema.safeParse({ ...valid, industryIds: [OTHER_INDUSTRY], industryOther: "a".repeat(81) }).success).toBe(false);
    expect(leadIndustryName({ industries: [], industryOther: "Solar panels" })).toBe("Other: Solar panels");
    expect(leadIndustryName({ industries: [{ name: "Photography" }, { name: "Videography" }], industryOther: "Drones" })).toBe("Photography, Videography, Other: Drones");
  });

  it("takes a native place from the list, or the visitor's own for 'Other'", () => {
    expect(leadSchema.parse({ ...valid, nativePlace: "Mota Chekhla" }).nativePlace).toBe("Mota Chekhla");
    expect(leadSchema.parse({ ...valid, nativePlace: OTHER_NATIVE_PLACE, nativePlaceOther: " Talod " }).nativePlaceOther).toBe("Talod");
    for (const [nativePlace, nativePlaceOther, field] of [["Talod", "", "nativePlace"], [OTHER_NATIVE_PLACE, "", "nativePlaceOther"], [OTHER_NATIVE_PLACE, "a\nb", "nativePlaceOther"]]) {
      const result = leadSchema.safeParse({ ...valid, nativePlace, nativePlaceOther });
      expect(result.success, `${nativePlace} / ${nativePlaceOther}`).toBe(false);
      if (!result.success) expect(fieldErrors(result.error)[field!]).toBeTruthy();
    }
  });

  it("takes exactly one industry", () => {
    const ids = ["0199b5c0-0000-7000-8000-000000000001", "0199b5c0-0000-7000-8000-000000000002"];
    expect(leadSchema.parse({ ...valid, industryIds: [ids[0], ids[0]] }).industryIds).toEqual([ids[0]]); // the same one twice is one
    const two = leadSchema.safeParse({ ...valid, industryIds: ids });
    expect(!two.success && fieldErrors(two.error).industryIds).toBe("Choose one industry.");
    for (const industryIds of [[], ids, ["steel"]]) {
      const result = leadSchema.safeParse({ ...valid, industryIds });
      expect(result.success).toBe(false);
      if (!result.success) expect(fieldErrors(result.error).industryIds).toBeTruthy();
    }
  });

  it("tidies the optional links, and refuses anything that isn't one", () => {
    const tidy = leadSchema.parse({ ...valid, website: "www.shah-textiles.in", instagram: "https://www.instagram.com/shah.textiles/?hl=en", mapsLink: "https://maps.app.goo.gl/abc123" });
    expect(tidy).toMatchObject({ website: "https://www.shah-textiles.in/", instagram: "shah.textiles", mapsLink: "https://maps.app.goo.gl/abc123" });
    expect(leadSchema.parse({ ...valid, instagram: "@shop_27" }).instagram).toBe("shop_27");
    for (const [field, value] of [["website", "javascript:alert(1)"], ["website", "not a site"], ["mapsLink", "ftp://x.y"], ["instagram", "two words"]]) {
      const result = leadSchema.safeParse({ ...valid, [field!]: value });
      expect(result.success, `${field} = ${value}`).toBe(false);
      if (!result.success) expect(fieldErrors(result.error)[field!]).toBeTruthy();
    }
  });

  it("accepts other countries when a country code is given", () => {
    expect(leadSchema.parse({ ...valid, phone: "+44 20 7946 0958" }).phone).toBe("+442079460958");
  });

  it.each([
    ["firstName", ""],
    ["firstName", "Asha\nBcc: x@evil.test"],
    ["lastName", ""],
    ["city", ""],
    ["state", "Gujarat State"],
    ["pincode", "38001"],
    ["pincode", "080001"],
    ["pincode", "abcdef"],
    ["fatherName", ""],
    ["fatherName", "R\nBcc: x@evil.test"],
    ["nativePlace", " "],
    ["address", ""],
    ["phone", ""],
    ["phone", "12345"],
    ["phone", "not a phone"],
    ["email", "asha@"],
    ["businessCategory", "FARMING"],
    ["industryIds", ["steel"]],
    ["paymentProof", ""],
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
        ["address", "businessCategory", "city", "email", "fatherName", "firstName", "industryIds", "lastName", "nativePlace", "paymentProof", "phone", "pincode", "state"].sort(),
      );
    }
  });
});

describe("member usernames", () => {
  it("are 3 to 30 lowercase letters, numbers, dots or underscores", () => {
    expect(usernameSchema.parse(" YugShah27 ")).toBe("yugshah27");
    for (const ok of ["yug", "yug.shah", "yug_shah", "27yug"]) expect(usernameSchema.safeParse(ok).success, ok).toBe(true);
    for (const bad of ["yu", "yug shah", ".yug", "yug-shah", "a".repeat(31), "યુગ"]) expect(usernameSchema.safeParse(bad).success, bad).toBe(false);
  });

  it("are suggested from the name", () => {
    expect(suggestUsername({ firstName: "Yug", lastName: "Shah", fullName: "Yug Ramesh Shah" })).toBe("yugshah");
    expect(suggestUsername({ firstName: null, lastName: null, fullName: "Asha Patel" })).toBe("ashapatel");
    expect(suggestUsername({ firstName: "Om", lastName: "", fullName: "Om" })).toBe("omseller");
  });
});
