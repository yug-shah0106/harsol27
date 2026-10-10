import "server-only";
import { env } from "./env";

/**
 * Delivers a one-time code by SMS. Sign-in by SMS is switched off for now (nothing calls this; see
 * docs/FUTURE.md). Only the "console" sender exists: it writes the code to the server log, so it is
 * for development and staging only. Adding a provider means adding a case here and to SMS_PROVIDER.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  switch (env().SMS_PROVIDER) {
    case "console":
      console.warn(JSON.stringify({ level: "warn", message: "console SMS (not delivered)", to: phone, code }));
      return;
    default:
      throw new Error("No SMS provider is configured (SMS_PROVIDER is not set).");
  }
}
