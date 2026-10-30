import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { phoneNumber } from "better-auth/plugins";
import { db } from "./db";
import { env } from "./env";
import { checkOtp } from "./otp";
import { enqueuePasswordResetEmail } from "./jobs";
import { hashPassword, MEMBER_PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, verifyPassword } from "./password";

/** Placeholder address for phone-only members (Better Auth requires a unique email). Never deliverable. */
export function memberPlaceholderEmail(phone: string): string {
  return `${phone.replace(/\D/g, "")}@phone.harsol27.invalid`;
}

export const isPlaceholderEmail = (email: string) => email.endsWith("@phone.harsol27.invalid");

/**
 * Better Auth is used as a library: its HTTP handler is NOT mounted. Every sign-in and password reset goes
 * through our own server actions, which apply our rate limits, lockout and role checks before calling
 * `auth().api.*`. No Google sign-in; buyers sign up through our own action (member-auth.ts), seller logins are
 * made by the team (member-logins.ts), staff with `pnpm staff`.
 */
function createAuth() {
  const { BETTER_AUTH_URL, BETTER_AUTH_SECRET, CLIENT_IP_HEADER } = env();
  return betterAuth({
    appName: "Harsol27",
    baseURL: BETTER_AUTH_URL,
    secret: BETTER_AUTH_SECRET,
    trustedOrigins: [BETTER_AUTH_URL],
    database: prismaAdapter(db(), { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      // No sign-up at all: member logins are made by the team from approved Seller registrations
      // (server/member-logins.ts), staff accounts with `pnpm staff`. Both write the account directly.
      disableSignUp: true,
      minPasswordLength: MEMBER_PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      password: { hash: hashPassword, verify: verifyPassword },
      // Reset links, emailed by the worker: staff (/staff/forgot-password) and, since 2026-10-30, members
      // (/forgot-password). password-reset.ts checks who may ask before Better Auth gets here.
      sendResetPassword: async ({ user, token }) => {
        await enqueuePasswordResetEmail(user.id, token);
      },
      // The password is theirs now: the copy an admin issued (member-logins.ts) no longer applies.
      onPasswordReset: async ({ user }) => {
        await db().user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, issuedPassword: null } });
      },
      revokeSessionsOnPasswordReset: true,
    },
    user: {
      additionalFields: {
        role: { type: "string", input: false, defaultValue: "MEMBER" },
        disabledAt: { type: "date", required: false, input: false },
        mobile: { type: "string", required: false, input: true }, // validated by our sign-up action first
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      disableSessionRefresh: true, // fixed lifetime; staff are additionally capped in authz.ts
    },
    rateLimit: { enabled: false }, // only applies to the HTTP handler; see rate-limit.ts
    advanced: {
      cookiePrefix: "harsol27",
      useSecureCookies: BETTER_AUTH_URL.startsWith("https://"),
      database: { generateId: false }, // Postgres/Prisma assign UUIDv7 ids
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    plugins: [
      phoneNumber({
        // Codes are issued, hashed and sent by our own otp.ts / sms.ts (Better Auth would store them
        // in plain text). The plugin is used only to verify through checkOtp and create the session.
        sendOTP: () => {
          throw new Error("Phone codes are sent by server/member-auth.ts, not by Better Auth.");
        },
        verifyOTP: ({ phoneNumber: phone, code }) => checkOtp(phone, code),
        // Switched off (no SMS provider). Before turning it on, note it would create accounts on
        // verification, while member logins are now made only by the team.
        signUpOnVerification: { getTempEmail: memberPlaceholderEmail, getTempName: (phone) => phone },
      }),
      nextCookies(), // must stay last: lets server actions set the session cookie
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;

export function auth(): Auth {
  instance ??= createAuth();
  return instance;
}
