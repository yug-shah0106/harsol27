import { afterAll, describe, expect, it } from "vitest";
import { db } from "./db";
import { checkOtp, issueOtp, OTP_MAX_ATTEMPTS } from "./otp";

const phone = () => `+9198${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
const wrong = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, "0");

afterAll(() => db().$disconnect());

describe("one-time codes", () => {
  it("issues a 6-digit code and stores only a hash of it", async () => {
    const p = phone();
    const code = await issueOtp(p);
    expect(code).toMatch(/^\d{6}$/);
    const row = await db().otpChallenge.findFirstOrThrow({ where: { phone: p } });
    expect(row.codeHash).not.toContain(code);
    expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("accepts the right code exactly once", async () => {
    const p = phone();
    const code = await issueOtp(p);
    expect(await checkOtp(p, code)).toBe(true);
    expect(await checkOtp(p, code)).toBe(false);
  });

  it("accepts a correct code only once even when it arrives twice at the same moment", async () => {
    const p = phone();
    const code = await issueOtp(p);
    const results = await Promise.all([checkOtp(p, code), checkOtp(p, code), checkOtp(p, code)]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it(`stops accepting even the right code after ${OTP_MAX_ATTEMPTS} wrong guesses`, async () => {
    const p = phone();
    const code = await issueOtp(p);
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) expect(await checkOtp(p, wrong(code))).toBe(false);
    expect(await checkOtp(p, code)).toBe(false);
  });

  it("rejects an expired code", async () => {
    const p = phone();
    const code = await issueOtp(p);
    await db().otpChallenge.updateMany({ where: { phone: p }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await checkOtp(p, code)).toBe(false);
  });

  it("invalidates the earlier code when a new one is requested", async () => {
    const p = phone();
    const first = await issueOtp(p);
    const second = await issueOtp(p);
    if (first !== second) expect(await checkOtp(p, first)).toBe(false);
    expect(await checkOtp(p, second)).toBe(true);
  });

  it("binds a code to its phone number", async () => {
    const a = phone();
    const b = phone();
    const code = await issueOtp(a);
    await issueOtp(b);
    expect(await checkOtp(b, code)).toBe(false);
  });

  it("rejects malformed input without touching the database", async () => {
    expect(await checkOtp(phone(), "12345")).toBe(false);
    expect(await checkOtp(phone(), "abcdef")).toBe(false);
  });
});
