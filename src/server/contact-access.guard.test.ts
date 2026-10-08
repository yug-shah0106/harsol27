import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Seller contact details may only be read in these files. Anything else asking the database for
// them (select { contactPhone: true } or omit { contactPhone: false }) fails this test.
const ALLOWED = new Set([
  "src/server/db.ts", // declares the default omit (true there means hidden)
  "src/server/contact-access.ts", // the authorization rule itself
  "src/server/workers.ts", // server-side only: emails the seller at their own contact address
]);

const ROOT = path.resolve(import.meta.dirname, "../..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === "generated" || name === "node_modules") return [];
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

describe("seller contact details", () => {
  it("are requested from the database only by the allowed files", () => {
    const offenders = sourceFiles(path.join(ROOT, "src"))
      .map((file) => path.relative(ROOT, file))
      .filter((file) => !ALLOWED.has(file))
      .filter((file) => /contact(Phone|Email)\s*:\s*(true|false)\b/.test(readFileSync(path.join(ROOT, file), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("are omitted from every query by default", () => {
    const source = readFileSync(path.join(ROOT, "src/server/db.ts"), "utf8");
    expect(source).toMatch(/seller:\s*\{\s*contactPhone:\s*true,\s*contactEmail:\s*true\s*\}/);
    expect(source).toMatch(/omit:\s*OMIT/);
  });
});
