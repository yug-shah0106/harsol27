import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/*
 * The password an admin issued to a member, kept encrypted on the User (issuedPassword) so admins can read it again
 * and the worker can email it to the member (member-logins.ts). AES-256-GCM, with a key derived from
 * BETTER_AUTH_SECRET: a database copy alone does not reveal passwords. No Next.js imports: the worker uses this too.
 */

function passwordKey(secret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secret, "", "harsol27 issued member password", 32));
}

export function sealIssuedPassword(password: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", passwordKey(secret), iv);
  const data = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
}

/** The issued password, or null when there is none or it can't be opened (BETTER_AUTH_SECRET changed: reset it). */
export function openIssuedPassword(sealed: string | null | undefined, secret: string): string | null {
  if (!sealed) return null;
  try {
    const [iv, tag, data] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", passwordKey(secret), iv!);
    decipher.setAuthTag(tag!);
    return Buffer.concat([decipher.update(data!), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
