import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { fieldErrors } from "@/lib/lead-schema";
import { inquirySchema } from "@/lib/product-schema";
import type { Member } from "./authz";
import { clientIpFrom } from "./client-ip";
import { db } from "./db";
import { env } from "./env";
import { UserFacingError } from "./errors";
import { enqueueInTransaction, getBoss, QUEUES, type InquiryJob } from "./jobs";
import { consumeRateLimit } from "./rate-limit";
import { publicProductWhere, publicSellerWhere } from "./visibility";

/**
 * No daily cap (client decision, 2026-10-08). These limits only stop automated harvesting of seller
 * contacts; a person sending inquiries by hand never reaches them.
 */
export const INQUIRY_RULES = {
  perBuyer: { max: 20, windowSeconds: 10 * 60 },
  perIp: { max: 60, windowSeconds: 60 * 60 },
};

const targetSchema = z.object({ productId: z.uuid().optional(), sellerId: z.uuid().optional() });

/**
 * Sends an inquiry about a product (or to a seller directly). The target must be public, a seller
 * cannot inquire to themselves, and the inquiry plus the seller's email notification are saved
 * together. Once saved, contact-access.ts lets this buyer see the seller's contact details.
 */
export async function sendInquiry(member: Member, form: FormData, headers: Headers): Promise<{ sellerId: string }> {
  const target = targetSchema.safeParse({
    productId: String(form.get("productId") ?? "") || undefined,
    sellerId: String(form.get("sellerId") ?? "") || undefined,
  });
  if (!target.success || (!target.data.productId && !target.data.sellerId)) throw new UserFacingError("This listing could not be found.");

  const parsed = inquirySchema.safeParse({ buyerName: form.get("buyerName") ?? "", message: form.get("message") ?? "" });
  if (!parsed.success) throw new UserFacingError("Please correct the highlighted fields.", fieldErrors(parsed.error));

  const ip = clientIpFrom(headers, env().CLIENT_IP_HEADER);
  for (const [key, rule] of [
    [`inquiry:buyer:${member.id}`, INQUIRY_RULES.perBuyer],
    [`inquiry:ip:${ip ?? "unknown"}`, INQUIRY_RULES.perIp],
  ] as const) {
    const limit = await consumeRateLimit(key, rule);
    if (!limit.allowed) throw new UserFacingError(`You have sent a lot of inquiries in a short time. Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`);
  }

  let sellerId: string;
  let productId: string | null = null;
  if (target.data.productId) {
    const product = await db().product.findFirst({ where: { AND: [{ id: target.data.productId }, publicProductWhere()] }, select: { id: true, sellerId: true } });
    if (!product) throw new UserFacingError("This listing is no longer available.");
    sellerId = product.sellerId;
    productId = product.id;
  } else {
    const seller = await db().seller.findFirst({ where: { AND: [{ id: target.data.sellerId }, publicSellerWhere()] }, select: { id: true } });
    if (!seller) throw new UserFacingError("This seller is no longer available.");
    sellerId = seller.id;
  }

  const own = await db().seller.count({ where: { id: sellerId, userId: member.id } });
  if (own) throw new UserFacingError("This is your own listing.");

  const boss = await getBoss();
  await db().$transaction(async (tx) => {
    await tx.user.update({ where: { id: member.id }, data: { name: parsed.data.buyerName } }); // remembered for next time
    const inquiry = await tx.inquiry.create({
      data: {
        buyerId: member.id,
        sellerId,
        productId,
        message: parsed.data.message,
        buyerName: parsed.data.buyerName,
        buyerPhone: member.phone,
        sourceIp: ip,
        userAgent: headers.get("user-agent")?.slice(0, 512) ?? null,
      },
      select: { id: true },
    });
    await enqueueInTransaction(boss, tx, QUEUES.inquiryNotification, { inquiryId: inquiry.id } satisfies InquiryJob);
  });
  return { sellerId };
}

/** The name to prefill: the member's name, unless it is still the phone-number placeholder. */
export async function buyerDisplayName(member: Member): Promise<string> {
  const user = await db().user.findUnique({ where: { id: member.id }, select: { name: true } });
  return user && user.name !== member.phone ? user.name : "";
}

const inquiryListSelect = {
  id: true,
  message: true,
  buyerName: true,
  buyerPhone: true,
  createdAt: true,
  product: { select: { name: true, slug: true } },
  seller: { select: { id: true, companyName: true, slug: true } },
} satisfies Prisma.InquirySelect;

/** For the staff overview. */
export function countRecentInquiries(days: number) {
  return db().inquiry.count({ where: { createdAt: { gte: new Date(Date.now() - days * 86_400_000) } } });
}

/** The buyer's own inquiries, newest first. */
export function listMyInquiries(member: Member) {
  return db().inquiry.findMany({ where: { buyerId: member.id }, orderBy: { createdAt: "desc" }, take: 200, select: inquiryListSelect });
}

export const INQUIRIES_PAGE_SIZE = 25;
const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
export const inquiryPageSchema = z.object({
  q: z.preprocess(first, z.string().trim().max(100).optional()).catch(undefined),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(100_000).default(1)).catch(1),
});

/** Inquiries received by one seller (seller dashboard), or by everyone (staff, with the source IP). */
export async function listInquiries(params: z.infer<typeof inquiryPageSchema>, scope: { sellerId: string } | "all") {
  const where: Prisma.InquiryWhereInput = {
    ...(scope !== "all" && { sellerId: scope.sellerId }),
    ...(params.q && {
      OR: [
        { buyerName: { contains: params.q, mode: "insensitive" } },
        { buyerPhone: { contains: params.q.replace(/[^\d+]/g, "") || params.q } },
        { product: { name: { contains: params.q, mode: "insensitive" } } },
        ...(scope === "all" ? [{ seller: { companyName: { contains: params.q, mode: "insensitive" as const } } }] : []),
      ],
    }),
  };
  const [total, items] = await db().$transaction([
    db().inquiry.count({ where }),
    db().inquiry.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (params.page - 1) * INQUIRIES_PAGE_SIZE,
      take: INQUIRIES_PAGE_SIZE,
      select: { ...inquiryListSelect, sourceIp: scope === "all", userAgent: scope === "all" },
    }),
  ]);
  return { total, items, pageCount: Math.max(1, Math.ceil(total / INQUIRIES_PAGE_SIZE)) };
}
