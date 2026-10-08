import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { phoneNumber } from "better-auth/plugins";
import { db } from "./db";
import { env } from "./env";
import { checkOtp } from "./otp";
import { hashPassword, PASSWORD_MAX_LENGTH, STAFF_PASSWORD_MIN_LENGTH, verifyPassword } from "./password";

/** Placeholder address for phone-only members (Better Auth requires a unique email). Never deliverable. */
export function memberPlaceholderEmail(phone: string): string {
  return `${phone.replace(/\D/g, "")}@phone.harsol27.invalid`;
}

/**
 * Better Auth is used as a library only: its HTTP handler is deliberately NOT mounted under
 * /api/auth. Every sign-in goes through our own server actions, which apply our rate limits,
 * staff lockout and role checks before calling `auth().api.*`. No endpoint can bypass them.
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
      disableSignUp: true, // staff accounts are created only with `pnpm staff`
      minPasswordLength: STAFF_PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    user: {
      additionalFields: {
        role: { type: "string", input: false, defaultValue: "MEMBER" },
        disabledAt: { type: "date", required: false, input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      disableSessionRefresh: true, // fixed lifetime; staff are additionally capped in authz.ts
    },
    rateLimit: { enabled: false }, // only applies to the unmounted HTTP handler; see rate-limit.ts
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
