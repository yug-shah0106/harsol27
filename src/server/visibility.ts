import type { Prisma } from "@/generated/prisma/client";

/**
 * THE rule for what the public can see. Every public query (search, industry pages, product and
 * seller pages, sitemap, photos, inquiries) composes these, so the rule lives in exactly one place.
 *
 * A seller is public when APPROVED and their paid-until date is today or later, in India time.
 * Expiry needs no background job: the date is compared on every query.
 * A product is public when its seller is, it is not hidden or removed, and its industry is active.
 */

/** Today's date in India, as the UTC-midnight Date that Prisma uses for @db.Date columns. */
export function indiaToday(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function publicSellerWhere(now: Date = new Date()): Prisma.SellerWhereInput {
  return { status: "APPROVED", paidUntil: { gte: indiaToday(now) } };
}

export function publicProductWhere(now: Date = new Date()): Prisma.ProductWhereInput {
  return { isHidden: false, removedAt: null, industry: { isActive: true }, seller: publicSellerWhere(now) };
}
