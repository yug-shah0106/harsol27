import "server-only";
import { env } from "./env";

/**
 * Delivers a one-time code by SMS. Only the "console" sender exists until an SMS provider is chosen
 * (docs/FUTURE.md): it writes the code to the server log, so it is for development and staging only.
 * Adding a provider means adding a case here and to SMS_PROVIDER; nothing else changes.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  switch (env().SMS_PROVIDER) {
    case "console":
      console.warn(JSON.stringify({ level: "warn", message: "console SMS (not delivered)", to: phone, code }));
      return;
  }
}
