import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("produces salted argon2id hashes that verify only the right password", async () => {
    const a = await hashPassword("correct horse battery");
    const b = await hashPassword("correct horse battery");
    expect(a).toMatch(/^\$argon2id\$/);
    expect(a).not.toBe(b);
    expect(await verifyPassword({ hash: a, password: "correct horse battery" })).toBe(true);
    expect(await verifyPassword({ hash: a, password: "correct horse batterY" })).toBe(false);
  });

  it("treats a malformed stored hash as a wrong password instead of throwing", async () => {
    expect(await verifyPassword({ hash: "not-a-hash", password: "x" })).toBe(false);
  });
});
