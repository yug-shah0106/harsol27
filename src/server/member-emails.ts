import { createHash } from "node:crypto";
import { escapeHtml, type Email } from "./email";
import { emailLayout } from "./lead-emails";

export type PasswordResetForEmail = { email: string; name: string; token: string };

/** Sent when a staff member asks to reset their password (/staff/forgot-password). The link works once, for an hour. */
export function passwordResetEmail(reset: PasswordResetForEmail, appUrl: string): Email {
  const link = `${appUrl}/staff/reset-password?token=${encodeURIComponent(reset.token)}`;
  return {
    to: reset.email,
    subject: "Reset your Harsol27 password",
    text: [
      `Hello ${reset.name},`,
      "",
      "We received a request to reset the password for your Harsol27 staff account. Open this link to choose a new one:",
      "",
      link,
      "",
      "The link works once, for 1 hour. If you did not ask for this, ignore this email: your password stays the same.",
    ].join("\n"),
    html: emailLayout(
      `<p>Hello ${escapeHtml(reset.name)},</p>` +
        "<p>We received a request to reset the password for your Harsol27 staff account.</p>" +
        `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#56664f;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Choose a new password</a></p>` +
        `<p style="color:#5e5650;font-size:14px">The link works once, for 1 hour. If you did not ask for this, ignore this email: your password stays the same.</p>`,
    ),
    // The token never leaves in the key: Resend keeps keys in its logs.
    idempotencyKey: `password-reset:${createHash("sha256").update(reset.token).digest("hex").slice(0, 32)}`,
  };
}
