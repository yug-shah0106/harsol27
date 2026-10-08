import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { detectPhotoType, PHOTO_TYPES } from "@/lib/file-type";
import { fieldErrors } from "@/lib/lead-schema";
import { MAX_PHOTOS_PER_PRODUCT, photoUploadSchema, productSchema, specificationsFromForm } from "@/lib/product-schema";
import type { Member } from "./authz";
import { db } from "./db";
import { UserFacingError } from "./errors";
import { enqueueInTransaction, getBoss, QUEUES, type PhotoJob } from "./jobs";
import { logError } from "./log";
import { deletePhotoFiles } from "./photo-files";
import { consumeRateLimit } from "./rate-limit";
import { uniqueSlug } from "./slugs";
import type { StaffUser } from "./staff-policy";
import { headObject, presignUpload, readObjectStart } from "./storage";

const PHOTO_UPLOAD_RULE = { max: 200, windowSeconds: 60 * 60 };
const UPLOAD_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const isUuid = (v: unknown): v is string => z.uuid().safeParse(v).success;

// ───────────── The seller's own account ─────────────

export type SellerAccount = { id: string; userId: string };

/** Products can only be managed by an approved seller (suspended or pending sellers cannot). */
export async function requireApprovedSeller(member: Member): Promise<SellerAccount> {
  const seller = await db().seller.findUnique({ where: { userId: member.id }, select: { id: true, userId: true, status: true } });
  if (!seller || seller.status !== "APPROVED") throw new UserFacingError("Only approved sellers can manage products.");
  return { id: seller.id, userId: seller.userId };
}

/** The product, if it belongs to this seller. Never another seller's, whatever id is sent. */
async function ownProduct(seller: SellerAccount, productId: unknown) {
  const product = isUuid(productId)
    ? await db().product.findFirst({ where: { id: productId, sellerId: seller.id }, select: { id: true, removedAt: true } })
    : null;
  if (!product) throw new UserFacingError("This product could not be found.");
  if (product.removedAt) throw new UserFacingError("This listing was removed by the Harsol27 team and cannot be changed. Please contact us.");
  return product;
}

function parseProduct(form: FormData) {
  const parsed = productSchema.safeParse({
    name: form.get("name") ?? "",
    industryId: form.get("industryId") ?? "",
    description: form.get("description") ?? "",
    specifications: specificationsFromForm(form),
  });
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    // Specification problems are reported per row: specifications.3.value → spec_value_3.
    for (const issue of parsed.error.issues) {
      const [root, index, part] = issue.path;
      if (root === "specifications" && typeof index === "number" && typeof part === "string") fields[`spec_${part}_${index}`] ??= issue.message;
    }
    throw new UserFacingError("Please correct the highlighted fields.", fields);
  }
  return parsed.data;
}

async function requireActiveIndustry(industryId: string) {
  const industry = await db().industry.findFirst({ where: { id: industryId, isActive: true }, select: { id: true } });
  if (!industry) throw new UserFacingError("Please correct the highlighted fields.", { industryId: "Choose an industry from the list." });
}

export async function createProduct(seller: SellerAccount, form: FormData): Promise<string> {
  const data = parseProduct(form);
  await requireActiveIndustry(data.industryId);
  return db().$transaction(async (tx) => {
    const slug = await uniqueSlug(data.name, "product", async (prefix) =>
      (await tx.product.findMany({ where: { slug: { startsWith: prefix } }, select: { slug: true } })).map((p) => p.slug),
    );
    const product = await tx.product.create({ data: { ...data, sellerId: seller.id, slug }, select: { id: true } });
    return product.id;
  });
}

/** Edits name, industry, description and details. The web address (slug) never changes. */
export async function updateProduct(seller: SellerAccount, productId: unknown, form: FormData): Promise<void> {
  const product = await ownProduct(seller, productId);
  const data = parseProduct(form);
  await requireActiveIndustry(data.industryId);
  await db().product.update({ where: { id: product.id }, data });
}

export async function setProductHidden(seller: SellerAccount, productId: unknown, hidden: boolean): Promise<void> {
  const product = await ownProduct(seller, productId);
  await db().product.update({ where: { id: product.id }, data: { isHidden: hidden } });
}

export function listMyProducts(sellerId: string) {
  return db().product.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      isHidden: true,
      removedAt: true,
      industry: { select: { name: true, isActive: true } },
      photos: { where: { status: "READY" }, orderBy: { sortOrder: "asc" }, take: 1, select: { id: true } },
      _count: { select: { inquiries: true, photos: true } },
    },
  });
}

export function getMyProduct(sellerId: string, productId: string) {
  if (!isUuid(productId)) return Promise.resolve(null);
  return db().product.findFirst({
    where: { id: productId, sellerId },
    include: { photos: { orderBy: { sortOrder: "asc" } }, industry: { select: { name: true } } },
  });
}

// ───────────── Photos ─────────────

async function photoCount(productId: string): Promise<number> {
  return db().productPhoto.count({ where: { productId } });
}

/** Step 1: a 5-minute URL for the browser to PUT one photo to (type and size fixed by the signature). */
export async function createPhotoUpload(seller: SellerAccount, productId: unknown, raw: unknown): Promise<{ key: string; uploadUrl: string }> {
  const product = await ownProduct(seller, productId);
  const parsed = photoUploadSchema.safeParse(raw);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "This photo cannot be uploaded.");
  if ((await photoCount(product.id)) >= MAX_PHOTOS_PER_PRODUCT) throw new UserFacingError(`A product can have up to ${MAX_PHOTOS_PER_PRODUCT} photos.`);

  const limit = await consumeRateLimit(`photo-upload:seller:${seller.id}`, PHOTO_UPLOAD_RULE);
  if (!limit.allowed) throw new UserFacingError("Too many uploads. Please wait a while and try again.");

  const { fileName, contentType, sizeBytes } = parsed.data;
  const key = `photo-uploads/${seller.userId}/${crypto.randomUUID()}.${PHOTO_TYPES[contentType]}`;
  await db().upload.create({ data: { key, userId: seller.userId, purpose: "PRODUCT_PHOTO", fileName, contentType, sizeBytes } });
  return { key, uploadUrl: await presignUpload(key, contentType, sizeBytes) };
}

/**
 * Step 2: attach the uploaded file. It must be this seller's, unused, complete, and really a JPEG,
 * PNG or WebP. The photo row and its processing job are saved together; the worker makes the
 * web-sized versions.
 */
export async function attachPhoto(seller: SellerAccount, productId: unknown, key: unknown): Promise<void> {
  const product = await ownProduct(seller, productId);
  const upload =
    typeof key === "string"
      ? await db().upload.findFirst({
          where: { key, userId: seller.userId, purpose: "PRODUCT_PHOTO", claimedAt: null, createdAt: { gt: new Date(Date.now() - UPLOAD_MAX_AGE_MS) } },
        })
      : null;
  if (!upload) throw new UserFacingError("This upload has expired. Please choose the photo again.");
  const stored = await headObject(upload.key);
  if (!stored || stored.sizeBytes !== upload.sizeBytes) throw new UserFacingError("The photo did not finish uploading. Please try again.");
  if (detectPhotoType(await readObjectStart(upload.key, 12)) !== upload.contentType) {
    throw new UserFacingError("This file is not a real JPG, PNG or WebP image.");
  }

  const boss = await getBoss();
  await db().$transaction(async (tx) => {
    const count = await tx.productPhoto.count({ where: { productId: product.id } });
    if (count >= MAX_PHOTOS_PER_PRODUCT) throw new UserFacingError(`A product can have up to ${MAX_PHOTOS_PER_PRODUCT} photos.`);
    const claimed = await tx.upload.updateMany({ where: { key: upload.key, claimedAt: null }, data: { claimedAt: new Date() } });
    if (claimed.count === 0) throw new UserFacingError("This photo was already added.");
    const { _max } = await tx.productPhoto.aggregate({ where: { productId: product.id }, _max: { sortOrder: true } });
    const photo = await tx.productPhoto.create({
      data: { productId: product.id, uploadKey: upload.key, sortOrder: (_max.sortOrder ?? 0) + 1 },
      select: { id: true },
    });
    await enqueueInTransaction(boss, tx, QUEUES.productPhoto, { photoId: photo.id } satisfies PhotoJob);
  });
}

async function ownPhoto(seller: SellerAccount, photoId: unknown) {
  const photo = isUuid(photoId)
    ? await db().productPhoto.findFirst({
        where: { id: photoId, product: { sellerId: seller.id } },
        select: { id: true, productId: true, sortOrder: true, uploadKey: true, product: { select: { removedAt: true } } },
      })
    : null;
  if (!photo) throw new UserFacingError("This photo could not be found.");
  if (photo.product.removedAt) throw new UserFacingError("This listing was removed by the Harsol27 team and cannot be changed.");
  return photo;
}

export async function deletePhoto(seller: SellerAccount, photoId: unknown): Promise<void> {
  const photo = await ownPhoto(seller, photoId);
  await db().productPhoto.delete({ where: { id: photo.id } });
  await deletePhotoFiles(photo.productId, photo.id, photo.uploadKey).catch((error: unknown) => logError(error, { deletedPhoto: photo.id }));
}

/** Swaps the photo with its neighbour; the first photo is the one shown in search results. */
export async function movePhoto(seller: SellerAccount, photoId: unknown, direction: "up" | "down"): Promise<void> {
  const photo = await ownPhoto(seller, photoId);
  await db().$transaction(async (tx) => {
    const neighbour = await tx.productPhoto.findFirst({
      where: { productId: photo.productId, sortOrder: direction === "up" ? { lt: photo.sortOrder } : { gt: photo.sortOrder } },
      orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
      select: { id: true, sortOrder: true },
    });
    if (!neighbour) return;
    await tx.productPhoto.update({ where: { id: photo.id }, data: { sortOrder: neighbour.sortOrder } });
    await tx.productPhoto.update({ where: { id: neighbour.id }, data: { sortOrder: photo.sortOrder } });
  });
}

// ───────────── Staff ─────────────

export const PRODUCTS_PAGE_SIZE = 25;
const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const staffProductParamsSchema = z.object({
  state: z.preprocess(first, z.enum(["listed", "hidden", "removed"]).optional()).catch(undefined),
  q: z.preprocess(first, z.string().trim().max(100).optional()).catch(undefined),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(100_000).default(1)).catch(1),
});
export type StaffProductParams = z.infer<typeof staffProductParamsSchema>;

export async function listProductsForStaff(params: StaffProductParams) {
  const where: Prisma.ProductWhereInput = {
    ...(params.state === "listed" && { isHidden: false, removedAt: null }),
    ...(params.state === "hidden" && { isHidden: true, removedAt: null }),
    ...(params.state === "removed" && { removedAt: { not: null } }),
    ...(params.q && {
      OR: [{ name: { contains: params.q, mode: "insensitive" } }, { seller: { companyName: { contains: params.q, mode: "insensitive" } } }],
    }),
  };
  const [total, items] = await db().$transaction([
    db().product.count({ where }),
    db().product.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (params.page - 1) * PRODUCTS_PAGE_SIZE,
      take: PRODUCTS_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        isHidden: true,
        removedAt: true,
        createdAt: true,
        seller: { select: { companyName: true } },
        industry: { select: { name: true } },
        _count: { select: { inquiries: true } },
      },
    }),
  ]);
  return { total, items, pageCount: Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE)) };
}

export async function getProductForStaff(id: string) {
  if (!isUuid(id)) return null;
  const product = await db().product.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      industry: { select: { name: true } },
      seller: { select: { id: true, companyName: true, status: true, paidUntil: true } },
      _count: { select: { inquiries: true } },
    },
  });
  if (!product) return null;
  const activity = await db().auditLog.findMany({
    where: { entityType: "Product", entityId: id },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
  });
  return { ...product, activity };
}

const removalSchema = z.object({ productId: z.uuid(), reason: z.string().trim().min(1, "Give a reason for removing this listing.").max(1000) });

/** Takes a listing off the site. Nothing is deleted; who, when and why go to the audit log. */
export async function removeProduct(input: Record<string, unknown>, actor: StaffUser): Promise<void> {
  const parsed = removalSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError("Please give a reason.", fieldErrors(parsed.error));
  const { productId, reason } = parsed.data;
  await db().$transaction(async (tx) => {
    const { count } = await tx.product.updateMany({ where: { id: productId, removedAt: null }, data: { removedAt: new Date() } });
    if (count === 0) throw new UserFacingError("This listing is already removed, or no longer exists.");
    await tx.auditLog.create({ data: { actorId: actor.id, action: "PRODUCT_REMOVED", entityType: "Product", entityId: productId, details: { reason } } });
  });
}

export async function restoreProduct(productId: unknown, actor: StaffUser): Promise<void> {
  if (!isUuid(productId)) throw new UserFacingError("This listing no longer exists.");
  await db().$transaction(async (tx) => {
    const { count } = await tx.product.updateMany({ where: { id: productId, removedAt: { not: null } }, data: { removedAt: null } });
    if (count === 0) throw new UserFacingError("This listing is not removed.");
    await tx.auditLog.create({ data: { actorId: actor.id, action: "PRODUCT_RESTORED", entityType: "Product", entityId: productId } });
  });
}
