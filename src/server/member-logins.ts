import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, randomInt } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { fieldErrors, usernameSchema } from "@/lib/lead-schema";
import { db } from "./db";
import { env } from "./env";
import { UserFacingError } from "./errors";
import { hashPassword } from "./password";
import type { StaffUser } from "./staff-policy";

/*
 * Member logins are made by the team, never by the members themselves (client, 2026-10-19): an admin
 * picks a username for an approved Seller registration and gets a generated password, shown once, to send
 * on WhatsApp. Rejecting the registration later switches the login off (leads.ts → decideLead).
 *
 * The client wants the password to stay visible to admins (2026-10-19), so besides the argon2id hash that
 * sign-in checks, it is kept encrypted on the User (issuedPassword). Members never choose a password, so
 * nothing they use elsewhere is exposed; admins could reset it anyway.
 */

// No look-alikes (0/O, 1/l/I), so a password read off WhatsApp is typed right the first time.
const PASSWORD_LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** 12 characters from 55: about 69 bits, well past guessing (and sign-in locks after repeated misses). */
export function generatePassword(length = 12): string {
  return Array.from({ length }, () => PASSWORD_LETTERS[randomInt(PASSWORD_LETTERS.length)]).join("");
}

// AES-256-GCM, with a key derived from BETTER_AUTH_SECRET: a database copy alone does not reveal passwords.
function passwordKey(): Buffer {
  return Buffer.from(hkdfSync("sha256", env().BETTER_AUTH_SECRET, "", "harsol27 issued member password", 32));
}

function sealPassword(password: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", passwordKey(), iv);
  const data = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
}

/** The issued password, or null when there is none or it can't be opened (BETTER_AUTH_SECRET changed: reset it). */
export function openPassword(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  try {
    const [iv, tag, data] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", passwordKey(), iv!);
    decipher.setAuthTag(tag!);
    return Buffer.concat([decipher.update(data!), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

const loginSchema = z.object({ leadId: z.uuid(), username: usernameSchema });

/** Makes the member login for an approved registration, with a generated password. */
export async function createLeadLogin(input: Record<string, unknown>, actor: StaffUser): Promise<{ username: string; password: string }> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError("Please correct the highlighted field.", fieldErrors(parsed.error));
  const { leadId, username } = parsed.data;
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  try {
    await db().$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { decision: true, userId: true, fullName: true, email: true, phone: true } });
      if (!lead) throw new UserFacingError("This lead no longer exists.");
      if (lead.decision !== "APPROVED") throw new UserFacingError("A login can be made only once the registration is approved.");
      if (lead.userId) throw new UserFacingError("This registration already has a login.");
      if (await tx.user.findUnique({ where: { email: lead.email }, select: { id: true } })) {
        throw new UserFacingError(`Another account already uses ${lead.email}, so a login cannot be made for this registration.`);
      }
      const user = await tx.user.create({ data: { name: lead.fullName, email: lead.email, username, mobile: lead.phone, role: "MEMBER", issuedPassword: sealPassword(password) }, select: { id: true } });
      // Better Auth's email/password provider looks for exactly this "credential" account row.
      await tx.account.create({ data: { userId: user.id, accountId: user.id, providerId: "credential", password: passwordHash } });
      // Conditional: if someone else made a login a moment ago, this one is rolled back.
      const { count } = await tx.lead.updateMany({ where: { id: leadId, userId: null }, data: { userId: user.id } });
      if (count === 0) throw new UserFacingError("Someone else made a login for this registration a moment ago. Reload the page to see it.");
      await tx.auditLog.create({ data: { actorId: actor.id, action: "MEMBER_LOGIN_CREATED", entityType: "Lead", entityId: leadId, details: { username } } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new UserFacingError("Please correct the highlighted field.", { username: "That username is taken. Try another." });
    }
    throw error;
  }
  return { username, password };
}

/**
 * A new password for a registration's login, when the seller has forgotten theirs (members can't reset
 * their own: client, 2026-10-19). The old password stops working, every open session is signed out and a
 * lockout is lifted.
 */
export async function resetLeadPassword(input: Record<string, unknown>, actor: StaffUser): Promise<{ username: string; password: string }> {
  const leadId = z.uuid().safeParse(input.leadId);
  if (!leadId.success) throw new UserFacingError("This lead no longer exists.");
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  return db().$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id: leadId.data }, select: { user: { select: { id: true, username: true, disabledAt: true } } } });
    if (!lead) throw new UserFacingError("This lead no longer exists.");
    const user = lead.user;
    if (!user?.username) throw new UserFacingError("This registration has no login yet.");
    if (user.disabledAt) throw new UserFacingError("This login is switched off because the registration is not approved.");
    const { count } = await tx.account.updateMany({ where: { userId: user.id, providerId: "credential" }, data: { password: passwordHash } });
    if (count === 0) throw new UserFacingError("This login has no password to reset.");
    await tx.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, issuedPassword: sealPassword(password) } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "MEMBER_PASSWORD_RESET", entityType: "Lead", entityId: leadId.data, details: { username: user.username } } });
    return { username: user.username, password };
  });
}
