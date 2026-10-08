import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC of a one-time code, bound to the phone number it was sent to. Without the server secret a
 * leaked database row cannot be turned back into a code, and a code for one phone is useless for another.
 */
export function hashOtp(secret: string, phone: string, code: string): string {
  return createHmac("sha256", secret).update(`otp:v1:${phone}:${code}`).digest("hex");
}

export function otpMatches(secret: string, phone: string, code: string, storedHash: string): boolean {
  const expected = Buffer.from(hashOtp(secret, phone, code), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return expected.length === stored.length && timingSafeEqual(expected, stored);
}
