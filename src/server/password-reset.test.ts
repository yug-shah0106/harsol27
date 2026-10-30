import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "./db";
import { getBoss } from "./jobs";
import { RESET_LINK_INVALID, resetPassword } from "./password-reset";

// Reset links (Better Auth's "reset-password:<token>" rows) only work on their own kind's page (2026-10-30).

const run = crypto.randomUUID().slice(0, 8);
const headers = () => new Headers({ "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 20}` });

async function linkFor(role: "ADMIN" | "MEMBER", options: { username?: string } = {}) {
  const user = await db().user.create({ data: { name: `Reset ${role}`, email: `reset-${role.toLowerCase()}-${run}-${randomBytes(3).toString("hex")}@example.test`, role, issuedPassword: "sealed", ...options } });
  await db().account.create({ data: { userId: user.id, accountId: user.id, providerId: "credential", password: "old-hash" } });
  const token = randomBytes(18).toString("base64url");
  await db().verification.create({ data: { identifier: `reset-password:${token}`, value: user.id, expiresAt: new Date(Date.now() + 3600_000) } });
  return { user, token };
}

afterAll(async () => {
  await (await getBoss()).stop({ graceful: false });
  await db().$disconnect();
});

describe("password reset links", () => {
  it("a staff link is refused on the member page, so a short member-length password can't be set", async () => {
    const { user, token } = await linkFor("ADMIN");
    await expect(resetPassword("member", token, "eight-ch", headers())).rejects.toThrow(RESET_LINK_INVALID);
    expect((await db().account.findFirstOrThrow({ where: { userId: user.id } })).password).toBe("old-hash");
  });

  it("a member link sets their own password, once; the admin-issued copy is dropped and sellers are told so", async () => {
    const { user, token } = await linkFor("MEMBER", { username: `reset.${run}` });
    await expect(resetPassword("staff", token, "a-long-enough-staff-password", headers())).rejects.toThrow(RESET_LINK_INVALID);
    await expect(resetPassword("member", token, "kite-2026", headers())).resolves.toEqual({ username: `reset.${run}` });
    const after = await db().user.findUniqueOrThrow({ where: { id: user.id }, include: { accounts: true } });
    expect(after.accounts[0]!.password).not.toBe("old-hash");
    expect(after.issuedPassword).toBeNull();
    await expect(resetPassword("member", token, "kite-2027", headers())).rejects.toThrow(RESET_LINK_INVALID);
  });
});
