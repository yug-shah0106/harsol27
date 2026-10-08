import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Layouts are not re-run on every navigation, so each private page must check access itself.
// This fails the build if a new page under /admin, /seller or /account forgets to.
const APP = import.meta.dirname;

function files(dir: string, names: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full, names);
    return names.includes(name) ? [full] : [];
  });
}

const RULES = [
  { dir: "admin", names: ["page.tsx"], mustCall: /\brequire(Staff|Admin)\(\)/ },
  { dir: "api/admin", names: ["route.ts"], mustCall: /\brequire(Staff|Admin)\(\)/ },
  { dir: "(public)/seller", names: ["page.tsx"], mustCall: /\brequire(Member|SellerPage)\(/ },
  { dir: "(public)/account", names: ["page.tsx"], mustCall: /\brequireMember\(/ },
];

describe("private pages check access themselves", () => {
  for (const { dir, names, mustCall } of RULES) {
    const found = files(path.join(APP, dir), names);
    it(`${dir} has pages`, () => expect(found.length).toBeGreaterThan(0));
    for (const file of found) {
      it(path.relative(APP, file), () => expect(readFileSync(file, "utf8")).toMatch(mustCall));
    }
  }
});
