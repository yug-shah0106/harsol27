import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { fieldErrors } from "@/lib/lead-schema";
import { addDays, EXPIRING_SOON_DAYS, fromDateInput, paymentSchema, rupeesToPaise } from "@/lib/subscription";
import { db } from "./db";
import { UserFacingError } from "./errors";
import type { StaffUser } from "./staff-policy";
import { indiaToday } from "./visibility";

// Sellers pay a yearly subscription off-site; staff record it here. Seller.paidUntil is the only
// thing visibility reads (visibility.ts). SubscriptionChange is the append-only record of who
// changed it, when, from what, and what was paid.

const recordSchema = paymentSchema.extend({
  sellerId: z.uuid(),
  expectedPaidUntil: z.union([z.literal(""), z.iso.date()]), // the date the admin saw on the page
});

/**
 * Records a payment and sets the new paid-until date, atomically with its history row. The update
 * only applies if the date is still the one the admin saw, so a double click or two admins at once
 * cannot record the same payment twice.
 */
export async function recordPayment(input: Record<string, unknown>, actor: StaffUser, now = new Date()): Promise<Date> {
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError("Please correct the highlighted fields.", fieldErrors(parsed.error));
  const { sellerId, expectedPaidUntil, paidUntil, amount, paidOn, reference, note } = parsed.data;
  const previous = expectedPaidUntil ? fromDateInput(expectedPaidUntil) : null;
  const next = fromDateInput(paidUntil);

  if (paidOn && fromDateInput(paidOn) > indiaToday(now)) {
    throw new UserFacingError("Please correct the highlighted fields.", { paidOn: "The payment date cannot be in the future." });
  }
  if (previous && next < previous && !note) {
    throw new UserFacingError("Please correct the highlighted fields.", {
      note: "The new date is earlier than the current one. Add a note explaining why (for example, correcting a typing mistake).",
    });
  }

  await db().$transaction(async (tx) => {
    const { count } = await tx.seller.updateMany({ where: { id: sellerId, paidUntil: previous }, data: { paidUntil: next } });
    if (count === 0) throw new UserFacingError("This seller's subscription changed a moment ago. Reload the page and check it before recording again.");
    await tx.subscriptionChange.create({
      data: {
        sellerId,
        previousPaidUntil: previous,
        newPaidUntil: next,
        amountPaise: rupeesToPaise(amount),
        paidOn: paidOn ? fromDateInput(paidOn) : null,
        reference: reference || null,
        note: note || null,
        actorId: actor.id,
      },
    });
  });
  return next;
}

// ───────────── Admin list ─────────────

export const SUBSCRIPTION_VIEWS = {
  expiring: `Expiring in ${EXPIRING_SOON_DAYS} days`,
  expired: "Expired",
  unpaid: "No payment yet",
  active: "All active",
} as const;
export type SubscriptionView = keyof typeof SUBSCRIPTION_VIEWS;
const VIEW_NAMES = Object.keys(SUBSCRIPTION_VIEWS) as [SubscriptionView, ...SubscriptionView[]];

export const SUBSCRIPTIONS_PAGE_SIZE = 25;
const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
export const subscriptionListParamsSchema = z.object({
  view: z.preprocess(first, z.enum(VIEW_NAMES).default("expiring")).catch("expiring"),
  q: z.preprocess(first, z.string().trim().max(100).optional()).catch(undefined),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(100_000).default(1)).catch(1),
});
export type SubscriptionListParams = z.infer<typeof subscriptionListParamsSchema>;

/** Subscriptions only matter for approved sellers; the others are not shown publicly anyway. */
function viewWhere(view: SubscriptionView, today: Date): Prisma.SellerWhereInput {
  const paidUntil = {
    expiring: { gte: today, lte: addDays(today, EXPIRING_SOON_DAYS) },
    expired: { lt: today },
    unpaid: null,
    active: { gte: today },
  }[view];
  return { status: "APPROVED", paidUntil };
}

export async function countSubscriptionViews(now = new Date()): Promise<Record<SubscriptionView, number>> {
  const today = indiaToday(now);
  const counts = await db().$transaction(VIEW_NAMES.map((view) => db().seller.count({ where: viewWhere(view, today) })));
  return Object.fromEntries(VIEW_NAMES.map((view, i) => [view, counts[i]])) as Record<SubscriptionView, number>;
}

export async function listSubscriptions(params: SubscriptionListParams, now = new Date()) {
  const where: Prisma.SellerWhereInput = {
    AND: [viewWhere(params.view, indiaToday(now)), params.q ? { companyName: { contains: params.q, mode: "insensitive" } } : {}],
  };
  const orderBy: Prisma.SellerOrderByWithRelationInput[] =
    params.view === "expired" ? [{ paidUntil: "desc" }] : params.view === "unpaid" ? [{ updatedAt: "desc" }] : [{ paidUntil: "asc" }];
  const [total, items] = await db().$transaction([
    db().seller.count({ where }),
    db().seller.findMany({
      where,
      orderBy: [...orderBy, { id: "asc" }],
      skip: (params.page - 1) * SUBSCRIPTIONS_PAGE_SIZE,
      take: SUBSCRIPTIONS_PAGE_SIZE,
      select: {
        id: true,
        companyName: true,
        city: true,
        paidUntil: true,
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
  ]);
  return { total, items, pageCount: Math.max(1, Math.ceil(total / SUBSCRIPTIONS_PAGE_SIZE)) };
}

/** For the staff seller page: every change (with the internal note) and the reminders sent. */
export function getSubscriptionForStaff(sellerId: string) {
  return db().$transaction([
    db().subscriptionChange.findMany({ where: { sellerId }, orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } }),
    db().subscriptionReminder.findMany({ where: { sellerId, sentAt: { not: null } }, orderBy: { sentAt: "desc" }, take: 20 }),
  ]);
}

/** For the seller's own page. The staff note is internal and not included. */
export function getMySubscriptionHistory(sellerId: string) {
  return db().subscriptionChange.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    select: { id: true, newPaidUntil: true, amountPaise: true, paidOn: true, reference: true, createdAt: true },
  });
}
