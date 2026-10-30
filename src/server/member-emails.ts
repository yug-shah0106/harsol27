import { createHash } from "node:crypto";
import { escapeHtml, type Email } from "./email";
import type { MemberLoginJob } from "./jobs";
import { emailLayout } from "./lead-emails";

/** `staff`: the link opens the staff page; members (buyers and sellers) have their own. */
export type PasswordResetForEmail = { email: string; name: string; token: string; staff: boolean };

/** `password` is null for a linked account, which keeps the password its owner chose. */
export type MemberLoginForEmail = MemberLoginJob & { email: string; name: string; username: string | null; password: string | null };

/**
 * To the member, at the address on their account (the registration's email): the login the team just made, or
 * their new password (2026-10-29). Sellers sign in with their username at /seller/sign-in, buyers with their email.
 */
export function memberLoginEmail(login: MemberLoginForEmail, appUrl: string): Email {
  const signIn = `${appUrl}${login.username ? "/seller/sign-in" : "/sign-in"}`;
  const rows: [string, string][] = [
    login.username ? ["Username", login.username] : ["Email", login.email],
    ["Password", login.password ?? "the one you already use on Harsol27"],
  ];
  const [subject, opening] =
    login.kind === "reset"
      ? ["Your new Harsol27 password", "The Harsol27 team has set a new password for your login. Your old password no longer works."]
      : ["Your Harsol27 seller login", "Your Seller registration is approved, and your seller login is ready."];
  const next = login.kind === "reset" ? [] : ["From your seller dashboard you can then send your company verification and list your products."];
  const after = `Keep this email to yourself. If you forget your password, choose "Forgot password?" on the sign-in page: we will email you a link to set a new one.`;
  return {
    to: login.email,
    subject,
    text: [`Hello ${login.name},`, "", opening, "", `Sign in: ${signIn}`, ...rows.map(([k, v]) => `${k}: ${v}`), "", ...next, ...(next.length ? [""] : []), after].join("\n"),
    html: emailLayout(
      `<p>Hello ${escapeHtml(login.name)},</p><p>${escapeHtml(opening)}</p>` +
        `<table style="border-collapse:collapse">${rows
          .map(([k, v]) => {
            const typed = k !== "Password" || login.password; // what they type, in a clear monospace
            return `<tr><td style="padding:4px 16px 4px 0;color:#5e5650">${k}</td><td style="padding:4px 0${typed ? ";font-family:monospace;font-size:16px;font-weight:600" : ""}">${escapeHtml(v)}</td></tr>`;
          })
          .join("")}</table>` +
        `<p><a href="${escapeHtml(signIn)}" style="display:inline-block;background:#9c2f28;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Sign in to Harsol27</a></p>` +
        next.map((line) => `<p>${escapeHtml(line)}</p>`).join("") +
        `<p style="color:#5e5650;font-size:14px">${escapeHtml(after)}</p>`,
    ),
    // One email per login made or password set. The password never goes in the key: Resend keeps keys in its logs.
    idempotencyKey: `member-login:${login.auditId}`,
  };
}

/** Sent when someone asks to reset their password (/forgot-password, /staff/forgot-password). The link works once, for an hour. */
export function passwordResetEmail(reset: PasswordResetForEmail, appUrl: string): Email {
  const link = `${appUrl}${reset.staff ? "/staff" : ""}/reset-password?token=${encodeURIComponent(reset.token)}`;
  const account = reset.staff ? "your Harsol27 staff account" : "your Harsol27 account";
  return {
    to: reset.email,
    subject: "Reset your Harsol27 password",
    text: [
      `Hello ${reset.name},`,
      "",
      `We received a request to reset the password for ${account}. Open this link to choose a new one:`,
      "",
      link,
      "",
      "The link works once, for 1 hour. If you did not ask for this, ignore this email: your password stays the same.",
    ].join("\n"),
    html: emailLayout(
      `<p>Hello ${escapeHtml(reset.name)},</p>` +
        `<p>We received a request to reset the password for ${account}.</p>` +
        `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#56664f;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Choose a new password</a></p>` +
        `<p style="color:#5e5650;font-size:14px">The link works once, for 1 hour. If you did not ask for this, ignore this email: your password stays the same.</p>`,
    ),
    // The token never leaves in the key: Resend keeps keys in its logs.
    idempotencyKey: `password-reset:${createHash("sha256").update(reset.token).digest("hex").slice(0, 32)}`,
  };
}
