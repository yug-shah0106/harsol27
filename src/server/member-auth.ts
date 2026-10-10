import "server-only";
import { APIError } from "better-auth/api";
import { isValidPhoneNumber } from "libphonenumber-js/max";
import { z } from "zod";
import { fieldErrors, leadSchema, phoneSchema } from "@/lib/lead-schema";
import { auth, isPlaceholderEmail } from "./auth";
import type { Member } from "./authz";
import { clientIpFrom } from "./client-ip";
import { db } from "./db";
import { env } from "./env";
import { UserFacingError } from "./errors";
import { issueOtp } from "./otp";
import { MEMBER_PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "./password";
import { consumeRateLimit } from "./rate-limit";
import { sendOtpSms } from "./sms";

/*
 * Buyers and sellers sign in with email and password (sign-in itself is password-auth.ts, shared
 * with staff), or with Google. Sign-in by SMS code (requestOtp / verifyOtpAndSignIn below) is
 * switched off until an SMS provider is connected (docs/FUTURE.md); nothing calls it.
 */

export const SIGN_UP_PER_IP = { max: 5, windowSeconds: 60 * 60 };
export const RESET_RULES = {
  requestPerIp: { max: 10, windowSeconds: 60 * 60 },
  requestPerEmail: { max: 3, windowSeconds: 60 * 60 },
  resetPerIp: { max: 10, windowSeconds: 15 * 60 },
};

export const EMAIL_TAKEN = "An account with this email already exists. Sign in, or reset your password if you have forgotten it.";
export const RESET_LINK_INVALID = "This reset link has expired or was already used. Ask for a new one below.";

const emailSchema = leadSchema.shape.email.refine((email) => !isPlaceholderEmail(email), "Enter a valid email address, like name@company.com.");
const passwordSchema = z
  .string()
  .min(MEMBER_PASSWORD_MIN_LENGTH, `Use at least ${MEMBER_PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`);
const signUpSchema = z.object({ name: leadSchema.shape.fullName, email: emailSchema, mobile: phoneSchema, password: passwordSchema });

const ipOf = (headers: Headers) => clientIpFrom(headers, env().CLIENT_IP_HEADER) ?? "unknown";
const fieldError = (field: string, error: z.ZodError) => new UserFacingError("Please correct the highlighted field.", { [field]: error.issues[0]?.message ?? "Check this field." });

/**
 * Creates a member account and signs it in. By decision there is no email check: the account works
 * at once. The mobile number is not verified either (no SMS); sellers receive it with inquiries.
 */
export async function signUpMember(form: FormData, headers: Headers): Promise<void> {
  await limit(`sign-up:ip:${ipOf(headers)}`, SIGN_UP_PER_IP, "Too many accounts created from your network.");
  const parsed = signUpSchema.safeParse({ name: form.get("name"), email: form.get("email"), mobile: form.get("mobile"), password: form.get("password") });
  if (!parsed.success) throw new UserFacingError("Please correct the highlighted fields.", fieldErrors(parsed.error));
  try {
    await auth().api.signUpEmail({ body: { ...parsed.data, rememberMe: true }, headers });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") throw new UserFacingError(EMAIL_TAKEN, { email: EMAIL_TAKEN });
    throw error;
  }
}

/**
 * Emails a reset link if the address belongs to an active member. The reply is the same either way,
 * so this cannot be used to find out who has an account. Staff reset with `pnpm staff`.
 */
export async function requestMemberPasswordReset(rawEmail: unknown, headers: Headers): Promise<void> {
  await limit(`reset-request:ip:${ipOf(headers)}`, RESET_RULES.requestPerIp, "Too many reset requests from your network.");
  const parsed = emailSchema.safeParse(String(rawEmail ?? ""));
  if (!parsed.success) throw fieldError("email", parsed.error);
  const email = parsed.data;
  await limit(`reset-request:email:${email}`, RESET_RULES.requestPerEmail, "Too many reset requests for this address.");
  const user = await db().user.findUnique({ where: { email }, select: { role: true, disabledAt: true } });
  if (user?.role === "MEMBER" && !user.disabledAt) await auth().api.requestPasswordReset({ body: { email }, headers });
}

/** Sets a new password from an emailed link (one use, one hour), then ends every other session. */
export async function resetMemberPassword(rawToken: unknown, rawPassword: unknown, headers: Headers): Promise<void> {
  await limit(`reset:ip:${ipOf(headers)}`, RESET_RULES.resetPerIp, "Too many attempts from your network.");
  const token = String(rawToken ?? "");
  if (!/^[\w-]{16,128}$/.test(token)) throw new UserFacingError(RESET_LINK_INVALID);
  const password = passwordSchema.safeParse(String(rawPassword ?? ""));
  if (!password.success) throw fieldError("password", password.error);
  try {
    await auth().api.resetPassword({ body: { newPassword: password.data, token }, headers });
  } catch (error) {
    if (error instanceof APIError && error.status === "BAD_REQUEST") throw new UserFacingError(RESET_LINK_INVALID);
    throw error;
  }
}

/** The mobile number sellers receive with inquiries: asked of Google sign-ups, and changeable later. */
export async function saveMemberMobile(member: Member, rawMobile: unknown): Promise<void> {
  const parsed = phoneSchema.safeParse(String(rawMobile ?? ""));
  if (!parsed.success) throw fieldError("mobile", parsed.error);
  await db().user.update({ where: { id: member.id }, data: { mobile: parsed.data } });
}

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
