import "server-only";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { fieldErrors, usernameSchema } from "@/lib/lead-schema";
import { db } from "./db";
import { UserFacingError } from "./errors";
import { hashPassword } from "./password";
import type { StaffUser } from "./staff-policy";

/*
 * Member logins are made by the team, never by the members themselves (client, 2026-10-19): an admin
 * picks a username for an approved Seller registration and gets a generated password, shown once, to send
 * on WhatsApp. Rejecting the registration later switches the login off (leads.ts → decideLead).
 */

// No look-alikes (0/O, 1/l/I), so a password read off WhatsApp is typed right the first time.
const PASSWORD_LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** 12 characters from 55: about 69 bits, well past guessing (and sign-in locks after repeated misses). */
export function generatePassword(length = 12): string {
  return Array.from({ length }, () => PASSWORD_LETTERS[randomInt(PASSWORD_LETTERS.length)]).join("");
}

const loginSchema = z.object({ leadId: z.uuid(), username: usernameSchema });

/** Makes the member login for an approved registration. Returns the password: it is never stored or shown again. */
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
      const user = await tx.user.create({ data: { name: lead.fullName, email: lead.email, username, mobile: lead.phone, role: "MEMBER" }, select: { id: true } });
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
