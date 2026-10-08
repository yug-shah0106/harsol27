import "server-only";
import { APIError } from "better-auth/api";
import { isValidPhoneNumber } from "libphonenumber-js/max";
import { phoneSchema } from "@/lib/lead-schema";
import { auth } from "./auth";
import { clientIpFrom } from "./client-ip";
import { env } from "./env";
import { UserFacingError } from "./errors";
import { issueOtp } from "./otp";
import { consumeRateLimit } from "./rate-limit";
import { sendOtpSms } from "./sms";

export const OTP_SEND_RULES = {
  perPhone: { max: 3, windowSeconds: 15 * 60 },
  perIp: { max: 10, windowSeconds: 60 * 60 },
};
export const OTP_VERIFY_PER_IP = { max: 20, windowSeconds: 15 * 60 };

export const WRONG_CODE = "That code is not right or has expired. Check it, or ask for a new code.";

function parsePhone(raw: unknown): string {
  const parsed = phoneSchema.safeParse(String(raw ?? ""));
  if (!parsed.success || !isValidPhoneNumber(parsed.data)) {
    throw new UserFacingError("Please correct the highlighted field.", { phone: "Enter a valid mobile number, for example 98765 43210." });
  }
  return parsed.data;
}

async function limit(key: string, rule: { max: number; windowSeconds: number }, message: string) {
  const result = await consumeRateLimit(key, rule);
  if (!result.allowed) throw new UserFacingError(`${message} Please try again in ${Math.ceil(result.retryAfterSeconds / 60)} minutes.`);
}

/**
 * Sends a sign-in code. The response is identical whether or not the number already has an account,
 * so nobody can use this to find out who is registered.
 */
export async function requestOtp(rawPhone: unknown, headers: Headers): Promise<{ phone: string }> {
  const phone = parsePhone(rawPhone);
  const ip = clientIpFrom(headers, env().CLIENT_IP_HEADER) ?? "unknown";
  await limit(`otp-send:ip:${ip}`, OTP_SEND_RULES.perIp, "Too many codes requested from your network.");
  await limit(`otp-send:phone:${phone}`, OTP_SEND_RULES.perPhone, "Too many codes requested for this number.");
  await sendOtpSms(phone, await issueOtp(phone));
  return { phone };
}

/** Checks the code and signs the person in, creating their account on first sign-in. */
export async function verifyOtpAndSignIn(rawPhone: unknown, rawCode: unknown, headers: Headers): Promise<void> {
  const phone = parsePhone(rawPhone);
  const ip = clientIpFrom(headers, env().CLIENT_IP_HEADER) ?? "unknown";
  await limit(`otp-verify:ip:${ip}`, OTP_VERIFY_PER_IP, "Too many attempts from your network.");
  const code = String(rawCode ?? "").replace(/\s/g, "");
  try {
    await auth().api.verifyPhoneNumber({ body: { phoneNumber: phone, code }, headers });
  } catch (error) {
    if (error instanceof APIError && (error.status === "BAD_REQUEST" || error.status === "FORBIDDEN")) {
      throw new UserFacingError(WRONG_CODE, { code: WRONG_CODE });
    }
    throw error;
  }
}

/** "+919876543210" → "+91 ••••• •3210": enough to recognise, not enough to harvest. */
export function maskPhone(phone: string): string {
  return `${phone.slice(0, 3)} ••••• •${phone.slice(-4)}`;
}
