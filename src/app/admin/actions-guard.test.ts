import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Hiding a button is not security. Every server action under /admin that changes data must call
// requireAdmin() itself, so a viewer (or anyone replaying a request) is refused on the server.
const ADMIN_DIR = import.meta.dirname;
const ALLOWED_WITHOUT_ADMIN = new Set(["signOutAction"]);

function actionFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return actionFiles(full);
    return name === "actions.ts" ? [full] : [];
  });
}

describe("admin server actions", () => {
  const files = actionFiles(ADMIN_DIR);

  it("exist", () => expect(files.length).toBeGreaterThan(0));

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const bodies = source.split(/^export async function /m).slice(1);
    for (const body of bodies) {
      const name = body.slice(0, body.indexOf("("));
      if (ALLOWED_WITHOUT_ADMIN.has(name)) continue;
      it(`${path.relative(ADMIN_DIR, file)} › ${name} calls requireAdmin()`, () => {
        expect(body).toContain("requireAdmin()");
      });
    }
  }
});
