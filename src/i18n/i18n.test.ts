import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/i18n";
import { fill, industryName, translateError } from "@/lib/i18n";
import { BUSINESS_CATEGORIES } from "@/lib/lead-schema";

const { en, hi, gu } = MESSAGES;

describe("translations", () => {
  // Industries staff add later show in English until they are added here.
  it("names the same industries in Hindi and Gujarati", () => {
    expect(Object.keys(gu.industries).sort()).toEqual(Object.keys(hi.industries).sort());
    expect(industryName(gu, "Insurance Agent")).toBe("વીમા એજન્ટ");
    expect(industryName(hi, "Solar Panels")).toBe("Solar Panels");
  });

  it("names every category", () => {
    for (const t of [en, hi, gu]) for (const c of BUSINESS_CATEGORIES) expect(t.categories[c.value]).toBeTruthy();
    expect(BUSINESS_CATEGORIES.map((c) => en.categories[c.value])).toEqual(BUSINESS_CATEGORIES.map((c) => c.label));
  });

  it("translates the same messages in both languages", () => {
    expect(Object.keys(gu.errors).sort()).toEqual(Object.keys(hi.errors).sort());
    expect(Object.keys(gu.errorPatterns).sort()).toEqual(Object.keys(hi.errorPatterns).sort());
  });

  it("translates errors, keeping what the pattern matched", () => {
    expect(translateError(hi, "Enter your city.")).toBe("अपना शहर लिखें।");
    expect(translateError(gu, "Please shorten it to 80 characters.")).toBe("કૃપા કરીને તેને 80 અક્ષરો સુધી ટૂંકું કરો.");
    expect(translateError(gu, "Something went wrong on our side. Please try again. (Reference ab12)")).toBe(
      "અમારી બાજુએ કંઈક ખોટું થયું. કૃપા કરીને ફરી પ્રયાસ કરો. (સંદર્ભ ab12)",
    );
    expect(translateError(en, "Enter your city.")).toBe("Enter your city.");
    expect(translateError(hi, "A message nobody translated.")).toBe("A message nobody translated.");
  });

  it("fills placeholders and leaves unknown ones", () => {
    expect(fill("{months} months, {from} to {until}", { months: 15, from: "1 Jan", until: "31 Mar" })).toBe("15 months, 1 Jan to 31 Mar");
    expect(fill("Step {n}", {})).toBe("Step {n}");
  });
});
