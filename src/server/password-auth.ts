import "server-only";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { auth } from "./auth";
import { clientIpFrom } from "./client-ip";
import { db } from "./db";
import { env } from "./env";
import { UserFacingError } from "./errors";
import { hashPassword, PASSWORD_MAX_LENGTH } from "./password";
import { consumeRateLimit } from "./rate-limit";
import { afterFailedLogin, isLocked, isStaffRole } from "./staff-policy";

/**
 * Password sign-in, shared by staff (/staff/sign-in, by email) and members (/sign-in, by the username the
 * team gave them). Each page accepts only its own kind of account: a staff login on the member page fails
 * like a wrong password, so staff can only get a session through the staff page and its rules.
 */
const KINDS = {
  // rememberMe: false → a browser-session cookie, gone when the browser closes.
  staff: { accepts: isStaffRole, rememberMe: false, by: "email", error: "Email or password is incorrect, or the account is temporarily locked. Please try again later." },
  member: { accepts: (role: unknown) => role === "MEMBER", rememberMe: true, by: "username", error: "Username or password is incorrect, or the account is temporarily locked. Please try again later." },
} as const;
export type PasswordAccountKind = keyof typeof KINDS;

// One message (per page) for an unknown login, a wrong password, locked and disabled accounts alike,
// so the response never reveals whether an account exists or what state it is in.
export const GENERIC_SIGN_IN_ERROR = KINDS.staff.error;
export const GENERIC_MEMBER_SIGN_IN_ERROR = KINDS.member.error;

const IP_RULE = { max: 10, windowSeconds: 15 * 60 };

const credentialsSchema = {
  email: z.object({ login: z.string().trim().toLowerCase().pipe(z.email()), password: z.string().min(1).max(PASSWORD_MAX_LENGTH) }),
  username: z.object({ login: z.string().trim().toLowerCase().min(1).max(30), password: z.string().min(1).max(PASSWORD_MAX_LENGTH) }),
};

/** `login` is the email (staff) or the username (members). */
export async function signInWithPassword(kind: PasswordAccountKind, input: { login: unknown; password: unknown }, requestHeaders: Headers): Promise<void> {
  const ip = clientIpFrom(requestHeaders, env().CLIENT_IP_HEADER) ?? "unknown";
  const limit = await consumeRateLimit(`${kind}-login:ip:${ip}`, IP_RULE);
  if (!limit.allowed) {
    throw new UserFacingError(
      `Too many sign-in attempts from your network. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minutes and try again.`,
    );
  }

  const { by, error: genericError } = KINDS[kind];
  const parsed = credentialsSchema[by].safeParse(input);
  if (!parsed.success) throw new UserFacingError(genericError);
  const { login, password } = parsed.data;

  const now = new Date();
  const user = await db().user.findUnique({
    where: by === "email" ? { email: login } : { username: login },
    select: { id: true, email: true, role: true, lockedUntil: true, disabledAt: true },
  });

  if (!user || !KINDS[kind].accepts(user.role) || user.disabledAt || isLocked(user.lockedUntil, now)) {
    await hashPassword(password); // same work as a real check, so timing reveals nothing either
    throw new UserFacingError(genericError);
  }

  try {
    // Better Auth checks the password against the account's email, whichever way it was found.
    await auth().api.signInEmail({ body: { email: user.email, password, rememberMe: KINDS[kind].rememberMe }, headers: requestHeaders });
  } catch (error) {
    if (error instanceof APIError && error.status === "UNAUTHORIZED") {
      await recordFailure(user.id, now);
      throw new UserFacingError(genericError);
    }
    throw error;
  }

  await db().user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
}

async function recordFailure(userId: string, now: Date): Promise<void> {
  // Increment atomically first, so parallel attempts cannot share one count.
  const { failedLoginCount } = await db().user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });
  const next = afterFailedLogin(failedLoginCount, now);
  if (next.lockedUntil) await db().user.update({ where: { id: userId }, data: next });
}
