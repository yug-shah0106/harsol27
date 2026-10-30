import "server-only";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { auth } from "./auth";
import { clientIpFrom } from "./client-ip";
import { db } from "./db";
import { env } from "./env";
import { UserFacingError } from "./errors";
import { MEMBER_PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, STAFF_PASSWORD_MIN_LENGTH } from "./password";
import { consumeRateLimit } from "./rate-limit";
import { isStaffRole } from "./staff-policy";

/*
 * Forgotten passwords, by an emailed link: staff at /staff/forgot-password → /staff/reset-password, and since
 * 2026-10-30 members too (buyers and sellers, by the email on their account) at /forgot-password → /reset-password.
 * Admins can still set a member a new one (member-logins.ts → resetMemberPassword).
 */

const KINDS = {
  staff: { accepts: isStaffRole, minPassword: STAFF_PASSWORD_MIN_LENGTH },
  member: { accepts: (role: unknown) => role === "MEMBER", minPassword: MEMBER_PASSWORD_MIN_LENGTH },
} as const;
export type ResetKind = keyof typeof KINDS;

export const RESET_RULES = {
  requestPerIp: { max: 10, windowSeconds: 60 * 60 },
  requestPerEmail: { max: 3, windowSeconds: 60 * 60 },
  resetPerIp: { max: 10, windowSeconds: 15 * 60 },
};

export const RESET_LINK_INVALID = "This reset link has expired or was already used. Ask for a new one below.";

const emailSchema = z.string().trim().toLowerCase().min(1, "Enter your email address.").max(254).pipe(z.email("Enter a valid email address, like name@company.com."));
const passwordSchema = (min: number) =>
  z.string().min(min, `Use at least ${min} characters.`).max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`);

const ipOf = (headers: Headers) => clientIpFrom(headers, env().CLIENT_IP_HEADER) ?? "unknown";
const fieldError = (field: string, error: z.ZodError) => new UserFacingError("Please correct the highlighted field.", { [field]: error.issues[0]?.message ?? "Check this field." });

async function limit(key: string, rule: { max: number; windowSeconds: number }, message: string) {
  const result = await consumeRateLimit(key, rule);
  if (!result.allowed) throw new UserFacingError(`${message} Please wait ${Math.ceil(result.retryAfterSeconds / 60)} minutes and try again.`);
}

/**
 * Emails a reset link if the address belongs to an active account of this kind. The reply is the same either way,
 * so this cannot be used to find out who has an account.
 */
export async function requestPasswordReset(kind: ResetKind, rawEmail: unknown, headers: Headers): Promise<void> {
  await limit(`reset-request:ip:${ipOf(headers)}`, RESET_RULES.requestPerIp, "Too many reset requests from your network.");
  const parsed = emailSchema.safeParse(String(rawEmail ?? ""));
  if (!parsed.success) throw fieldError("email", parsed.error);
  const email = parsed.data;
  await limit(`reset-request:email:${email}`, RESET_RULES.requestPerEmail, "Too many reset requests for this address.");
  const user = await db().user.findUnique({ where: { email }, select: { role: true, disabledAt: true } });
  if (user && KINDS[kind].accepts(user.role) && !user.disabledAt) await auth().api.requestPasswordReset({ body: { email }, headers });
}

/**
 * Sets a new password from an emailed link (one use, one hour), then ends every session. A link only works on its
 * own kind's page, so a staff link can't set a short member-length password. Returns whose password it was.
 */
export async function resetPassword(kind: ResetKind, rawToken: unknown, rawPassword: unknown, headers: Headers): Promise<{ username: string | null }> {
  await limit(`reset:ip:${ipOf(headers)}`, RESET_RULES.resetPerIp, "Too many attempts from your network.");
  const token = String(rawToken ?? "");
  if (!/^[\w-]{16,128}$/.test(token)) throw new UserFacingError(RESET_LINK_INVALID);
  const password = passwordSchema(KINDS[kind].minPassword).safeParse(String(rawPassword ?? ""));
  if (!password.success) throw fieldError("password", password.error);

  const link = await db().verification.findFirst({ where: { identifier: `reset-password:${token}`, expiresAt: { gt: new Date() } }, select: { value: true } });
  const user = link && (await db().user.findUnique({ where: { id: link.value }, select: { role: true, username: true, disabledAt: true } }));
  if (!user || !KINDS[kind].accepts(user.role) || user.disabledAt) throw new UserFacingError(RESET_LINK_INVALID);
  try {
    await auth().api.resetPassword({ body: { newPassword: password.data, token }, headers });
  } catch (error) {
    if (error instanceof APIError && error.status === "BAD_REQUEST") throw new UserFacingError(RESET_LINK_INVALID);
    throw error;
  }
  return { username: user.username };
}
