import "server-only";
import { APIError } from "better-auth/api";
import { isValidPhoneNumber } from "libphonenumber-js/max";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { fieldErrors, fullNameSchema, leadSchema, phoneSchema, usernameSchema } from "@/lib/lead-schema";
import { auth } from "./auth";
import type { Member } from "./authz";
import { clientIpFrom } from "./client-ip";
import { db } from "./db";
import { env } from "./env";
import { UserFacingError } from "./errors";
import { issueOtp } from "./otp";
import { hashPassword, MEMBER_PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "./password";
import { signInWithPassword } from "./password-auth";
import { consumeRateLimit } from "./rate-limit";
import { sendOtpSms } from "./sms";

/*
 * Members sign in with a username and password (password-auth.ts, shared with staff). Sellers get theirs from
 * the team (member-logins.ts); buyers make their own here (client, 2026-10-24). Nobody resets their own
 * password: the team makes a new one. Sign-in by SMS code (requestOtp / verifyOtpAndSignIn below) is switched
 * off until an SMS provider is connected (docs/FUTURE.md); nothing calls it.
 */

export const SIGN_UP_PER_IP = { max: 5, windowSeconds: 60 * 60 };
export const USERNAME_TAKEN = "That username is taken. Try another.";
export const EMAIL_TAKEN = "An account with this email already exists. Sign in, or ask the Harsol27 team for a new password.";

const signUpSchema = z.object({
  name: fullNameSchema,
  mobile: phoneSchema,
  email: leadSchema.shape.email,
  username: usernameSchema,
  password: z
    .string()
    .min(MEMBER_PASSWORD_MIN_LENGTH, `Use at least ${MEMBER_PASSWORD_MIN_LENGTH} characters.`)
    .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`),
});

/**
 * A buyer's own account, signed in at once. No email or SMS check (none is set up): the mobile number goes to
 * the sellers they send inquiries to. Rate-limited per network so accounts can't be made in bulk.
 */
export async function signUpBuyer(form: FormData, headers: Headers): Promise<void> {
  await limit(`sign-up:ip:${clientIpFrom(headers, env().CLIENT_IP_HEADER) ?? "unknown"}`, SIGN_UP_PER_IP, "Too many accounts made from your network.");
  const parsed = signUpSchema.safeParse(Object.fromEntries(["name", "mobile", "email", "username", "password"].map((field) => [field, String(form.get(field) ?? "")])));
  if (!parsed.success) throw new UserFacingError("Please correct the highlighted fields.", fieldErrors(parsed.error));
  const { name, mobile, email, username, password } = parsed.data;

  const taken = await db().user.findMany({ where: { OR: [{ username }, { email }] }, select: { username: true, email: true } });
  const fields: Record<string, string> = {};
  if (taken.some((user) => user.username === username)) fields.username = USERNAME_TAKEN;
  if (taken.some((user) => user.email === email)) fields.email = EMAIL_TAKEN;
  if (Object.keys(fields).length) throw new UserFacingError("Please correct the highlighted fields.", fields);

  const passwordHash = await hashPassword(password);
  try {
    await db().$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name, email, username, mobile, role: "MEMBER" }, select: { id: true } });
      // Better Auth's email/password provider looks for exactly this "credential" account row.
      await tx.account.create({ data: { userId: user.id, accountId: user.id, providerId: "credential", password: passwordHash } });
    });
  } catch (error) {
    // Someone took the username or email a moment ago.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new UserFacingError("Please correct the highlighted fields.", { username: USERNAME_TAKEN });
    }
    throw error;
  }
  await signInWithPassword("member", { login: username, password }, headers);
}

const fieldError = (field: string, error: z.ZodError) => new UserFacingError("Please correct the highlighted field.", { [field]: error.issues[0]?.message ?? "Check this field." });

/** The mobile number sellers receive with inquiries: asked of accounts without one, and changeable later. */
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
