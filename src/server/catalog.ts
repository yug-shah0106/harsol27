import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { INDIAN_STATES } from "@/lib/seller-schema";
import type { Viewer } from "./contact-access";
import { db } from "./db";
import { publicProductWhere, publicSellerWhere } from "./visibility";

// Everything here is public: only fields safe for anyone are selected, and visibility always comes
// from visibility.ts. Seller contact details are not even loadable here (see db.ts / contact-access.ts).

export const SEARCH_PAGE_SIZE = 24;
const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const searchParamsSchema = z.object({
  q: z.preprocess(first, z.string().trim().max(100).optional()).catch(undefined),
  industry: z.preprocess(first, z.string().trim().max(80).optional()).catch(undefined), // slug
  state: z.preprocess(first, z.enum(INDIAN_STATES).optional()).catch(undefined),
  city: z.preprocess(first, z.string().trim().max(80).optional()).catch(undefined),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(10_000).default(1)).catch(1),
});
export type SearchParams = z.infer<typeof searchParamsSchema>;

const cardSelect = {
  id: true,
  name: true,
  slug: true,
  industry: { select: { name: true } },
  seller: { select: { companyName: true, city: true, state: true } },
  photos: { where: { status: "READY" }, orderBy: { sortOrder: "asc" }, take: 1, select: { id: true } },
} satisfies Prisma.ProductSelect;

export type ProductCard = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

/**
 * One word's condition: in the product's name or description, its industry's name, or its seller's
 * company name (case-insensitive). Matching industries and sellers are looked up first, so the
 * product query only tests Product's own columns and can use their indexes. (Testing the joined
 * names inside the OR made Postgres read every product: ~350 ms per search at 100,000 products.)
 */
async function wordCondition(word: string, now: Date): Promise<Prisma.ProductWhereInput> {
  const contains = { contains: word, mode: "insensitive" as const };
  // ponytail: the seller ids go into the query as a list; past ~30,000 matching sellers, switch to a
  // raw `"sellerId" = ANY(ARRAY(SELECT …))` (scripts/search-benchmark.ts measures it).
  const [industries, sellers] = await Promise.all([
    db().industry.findMany({ where: { isActive: true, name: contains }, select: { id: true } }),
    db().seller.findMany({ where: { AND: [publicSellerWhere(now), { companyName: contains }] }, select: { id: true } }),
  ]);
  return {
    OR: [
      { name: contains },
      { description: contains },
      ...(industries.length ? [{ industryId: { in: industries.map((i) => i.id) } }] : []),
      ...(sellers.length ? [{ sellerId: { in: sellers.map((s) => s.id) } }] : []),
    ],
  };
}

/**
 * Keyword + industry + location search over visible products. Every word must appear somewhere in
 * the product name, description, industry or seller name (trigram indexes keep "contains" fast).
 * Newest listings first.
 */
export async function searchProducts(params: SearchParams, now = new Date()) {
  const words = (params.q ?? "").split(/\s+/).filter(Boolean).slice(0, 8);
  const where: Prisma.ProductWhereInput = {
    AND: [
      publicProductWhere(now),
      ...(await Promise.all(words.map((word) => wordCondition(word, now)))),
      ...(params.industry ? [{ industry: { slug: params.industry } }] : []),
      ...(params.state ? [{ seller: { state: params.state } }] : []),
      ...(params.city ? [{ seller: { city: { contains: params.city, mode: "insensitive" as const } } }] : []),
    ],
  };
  const [total, items] = await db().$transaction([
    db().product.count({ where }),
    db().product.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (params.page - 1) * SEARCH_PAGE_SIZE,
      take: SEARCH_PAGE_SIZE,
      select: cardSelect,
    }),
  ]);
  return { total, items, pageCount: Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE)) };
}

/** Active industries with how many visible products each has. */
export async function listIndustriesWithCounts(now = new Date()) {
  const industries = await db().industry.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, _count: { select: { products: { where: publicProductWhere(now) } } } },
  });
  return industries.map(({ _count, ...industry }) => ({ ...industry, productCount: _count.products }));
}

export function getActiveIndustryBySlug(slug: string) {
  return db().industry.findFirst({ where: { slug, isActive: true }, select: { id: true, name: true, slug: true } });
}

/**
 * A product page. Public when visible; otherwise only its seller and staff can preview it (with a
 * notice). Returns null for everyone else, so hidden listings are indistinguishable from missing ones.
 */
export async function getProductForPage(slug: string, viewer: Viewer, now = new Date()) {
  const product = await db().product.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      specifications: true,
      isHidden: true,
      removedAt: true,
      industry: { select: { name: true, slug: true } },
      seller: { select: { id: true, userId: true, slug: true, companyName: true, city: true, state: true } },
      photos: { where: { status: "READY" }, orderBy: { sortOrder: "asc" }, select: { id: true, width: true, height: true } },
    },
  });
  if (!product) return null;
  const isPublic = (await db().product.count({ where: { AND: [{ id: product.id }, publicProductWhere(now)] } })) === 1;
  const isOwner = viewer?.kind === "member" && viewer.id === product.seller.userId;
  if (!isPublic && !isOwner && viewer?.kind !== "staff") return null;
  const { id, slug: sellerSlug, companyName, city, state } = product.seller;
  return { ...product, seller: { id, slug: sellerSlug, companyName, city, state }, isPublic, isOwner };
}

/** A public seller profile with their visible products. Null unless the seller is public. */
export async function getPublicSeller(slug: string, now = new Date()) {
  const seller = await db().seller.findFirst({
    where: { AND: [{ slug }, publicSellerWhere(now)] },
    select: { id: true, userId: true, slug: true, companyName: true, description: true, city: true, state: true, createdAt: true },
  });
  if (!seller) return null;
  const products = await db().product.findMany({
    where: { AND: [{ sellerId: seller.id }, publicProductWhere(now)] },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: cardSelect,
  });
  return { ...seller, products };
}

/** For the sitemap: every visible product and seller. */
export async function listPublicSlugs(now = new Date()) {
  const [products, sellers] = await Promise.all([
    db().product.findMany({ where: publicProductWhere(now), select: { slug: true, updatedAt: true }, take: 45_000 }),
    db().seller.findMany({ where: publicSellerWhere(now), select: { slug: true, updatedAt: true }, take: 5_000 }),
  ]);
  return { products, sellers };
}
