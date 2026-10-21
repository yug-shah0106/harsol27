import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { UserFacingError } from "./errors";
import { uniqueSlug } from "./slugs";
import type { StaffUser } from "./staff-policy";

export const industryNameSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, " "))
  .pipe(z.string().min(2, "Enter at least 2 characters.").max(60, "Keep the name to 60 characters or fewer."));

/** Case- and spacing-insensitive identity of a name: "Steel  Products" and "steel products" collide. */
export function industryNameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

const DUPLICATE = "An industry with this name already exists.";

/**
 * Industries are listed A to Z everywhere (client, 2026-10-21), ignoring capitals so "IT Services" sits
 * after "Investment Firm" whatever the database's own collation does.
 */
export function alphabetical<T extends { name: string }>(industries: T[]): T[] {
  return industries.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

export async function listActiveIndustries() {
  return alphabetical(await db().industry.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true } }));
}

export async function listAllIndustries() {
  return alphabetical(await db().industry.findMany({ select: { id: true, name: true, slug: true, isActive: true, _count: { select: { leads: true } } } }));
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function industrySlug(tx: Prisma.TransactionClient, name: string): Promise<string> {
  return uniqueSlug(name, "industry", async (prefix) =>
    (await tx.industry.findMany({ where: { slug: { startsWith: prefix } }, select: { slug: true } })).map((r) => r.slug),
  );
}

export async function createIndustry(rawName: unknown, actor: StaffUser): Promise<void> {
  const name = parseName(rawName);
  const nameKey = industryNameKey(name);
  try {
    await db().$transaction(async (tx) => {
      if (await tx.industry.findUnique({ where: { nameKey }, select: { id: true } })) throw new UserFacingError(DUPLICATE, { name: DUPLICATE });
      const { _max } = await tx.industry.aggregate({ _max: { sortOrder: true } });
      const industry = await tx.industry.create({
        data: { name, nameKey, slug: await industrySlug(tx, name), sortOrder: (_max.sortOrder ?? 0) + 1 },
      });
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "INDUSTRY_CREATED", entityType: "Industry", entityId: industry.id, details: { name } },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new UserFacingError(DUPLICATE, { name: DUPLICATE });
    throw error;
  }
}

/** Renames only the display name; the slug (URL) stays the same so links never break. */
export async function renameIndustry(id: string, rawName: unknown, actor: StaffUser): Promise<void> {
  const name = parseName(rawName);
  const nameKey = industryNameKey(name);
  try {
    await db().$transaction(async (tx) => {
      const current = await tx.industry.findUnique({ where: { id }, select: { name: true } });
      if (!current) throw new UserFacingError("This industry no longer exists. Reload the page.");
      if (current.name === name) return;
      const clash = await tx.industry.findUnique({ where: { nameKey }, select: { id: true } });
      if (clash && clash.id !== id) throw new UserFacingError(DUPLICATE, { name: DUPLICATE });
      await tx.industry.update({ where: { id }, data: { name, nameKey } });
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "INDUSTRY_RENAMED", entityType: "Industry", entityId: id, details: { from: current.name, to: name } },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new UserFacingError(DUPLICATE, { name: DUPLICATE });
    throw error;
  }
}

/** Industries are never deleted: deactivating hides them from forms and public pages; history stays intact. */
export async function setIndustryActive(id: string, isActive: boolean, actor: StaffUser): Promise<void> {
  await db().$transaction(async (tx) => {
    const { count } = await tx.industry.updateMany({ where: { id, isActive: !isActive }, data: { isActive } });
    if (count === 0) return; // already in that state (double click, or another admin got there first)
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: isActive ? "INDUSTRY_ACTIVATED" : "INDUSTRY_DEACTIVATED",
        entityType: "Industry",
        entityId: id,
      },
    });
  });
}

function parseName(raw: unknown): string {
  const parsed = industryNameSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Enter a valid name.";
    throw new UserFacingError(message, { name: message });
  }
  return parsed.data;
}
