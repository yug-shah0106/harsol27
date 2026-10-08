import "server-only";
import { randomInt } from "node:crypto";
import { db } from "./db";
import { env } from "./env";
import { hashOtp, otpMatches } from "./otp-hash";

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_MAX_ATTEMPTS = 5;

/** Creates a fresh code for this phone. Any earlier unused code for the phone stops working. */
export async function issueOtp(phone: string): Promise<string> {
  const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
  const now = new Date();
  await db().$transaction([
    db().otpChallenge.updateMany({ where: { phone, consumedAt: null }, data: { consumedAt: now } }),
    db().otpChallenge.create({
      data: {
        phone,
        codeHash: hashOtp(env().BETTER_AUTH_SECRET, phone, code),
        expiresAt: new Date(now.getTime() + OTP_TTL_SECONDS * 1000),
      },
    }),
  ]);
  return code;
}

/**
 * Checks a code. Every check counts as an attempt (atomically, so parallel guesses cannot share
 * one), a correct code is consumed so it works only once, and after OTP_MAX_ATTEMPTS the code is dead.
 */
export async function checkOtp(phone: string, code: string): Promise<boolean> {
  if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) return false;

  const rows = await db().$queryRaw<{ id: string; codeHash: string }[]>`
    UPDATE "OtpChallenge" SET "attempts" = "attempts" + 1
    WHERE "id" = (
      SELECT "id" FROM "OtpChallenge"
      WHERE "phone" = ${phone} AND "consumedAt" IS NULL AND "expiresAt" > timezone('UTC', now())
      ORDER BY "createdAt" DESC LIMIT 1
    ) AND "attempts" < ${OTP_MAX_ATTEMPTS}
    RETURNING "id", "codeHash"`;
  const challenge = rows[0];
  if (!challenge || !otpMatches(env().BETTER_AUTH_SECRET, phone, code, challenge.codeHash)) return false;

  // Only one caller can consume it, even if the same correct code arrives twice at once.
  const { count } = await db().otpChallenge.updateMany({
    where: { id: challenge.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return count === 1;
}
