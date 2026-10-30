import "server-only";
import { isValidPhoneNumber } from "libphonenumber-js/max";
import { z } from "zod";
import { Prisma, type SellerDocumentKind } from "@/generated/prisma/client";
import { DOCUMENT_TYPES, detectDocumentType } from "@/lib/file-type";
import { fieldErrors } from "@/lib/lead-schema";
import {
  documentLabel,
  SELLER_DOCUMENTS,
  sellerApplicationSchema,
  sellerProfileSchema,
  uploadRequestSchema,
  type SellerDocumentKindValue,
} from "@/lib/seller-schema";
import { mayEditApplication, SELLER_DECISION_NAMES, SELLER_DECISIONS } from "@/lib/seller-status";
import type { Member } from "./authz";
import { db } from "./db";
import { UserFacingError } from "./errors";
import { enqueueInTransaction, getBoss, QUEUES, type SellerChangeJob } from "./jobs";
import { logError } from "./log";
import { consumeRateLimit } from "./rate-limit";
import { uniqueSlug } from "./slugs";
import type { StaffUser } from "./staff-policy";
import { deleteObject, headObject, presignUpload, readObjectStart } from "./storage";

const UPLOAD_RULE = { max: 30, windowSeconds: 60 * 60 };
const UPLOAD_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// ───────────── Document uploads (browser → storage directly) ─────────────

/**
 * Step 1 of an upload: check the declared file, record it, and hand back a 5-minute URL the browser
 * PUTs the file to. The URL only accepts exactly this type and size.
 */
export async function createDocumentUpload(member: Member, raw: unknown): Promise<{ key: string; uploadUrl: string }> {
  const parsed = uploadRequestSchema.safeParse(raw);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "This file cannot be uploaded.");
  const { kind, fileName, contentType, sizeBytes } = parsed.data;

  const limit = await consumeRateLimit(`doc-upload:user:${member.id}`, UPLOAD_RULE);
  if (!limit.allowed) throw new UserFacingError("Too many uploads. Please wait a while and try again.");

  const key = `seller-documents/${member.id}/${kind.toLowerCase()}-${crypto.randomUUID()}.${DOCUMENT_TYPES[contentType]}`;
  await db().upload.create({ data: { key, userId: member.id, purpose: "SELLER_DOCUMENT", fileName, contentType, sizeBytes } });
  return { key, uploadUrl: await presignUpload(key, contentType, sizeBytes) };
}

type VerifiedUpload = { key: string; fileName: string; contentType: string; sizeBytes: number };

/**
 * Step 2, at submission: the upload must be this member's, unused, recent, actually present in
 * storage with the declared size, and its first bytes must match its type (a renamed .exe is refused).
 */
async function verifyUpload(member: Member, key: string, field: string): Promise<VerifiedUpload> {
  const fail = (message: string): never => {
    throw new UserFacingError("Please check the highlighted documents.", { [field]: message });
  };
  const upload = await db().upload.findFirst({
    where: { key, userId: member.id, purpose: "SELLER_DOCUMENT", claimedAt: null, createdAt: { gt: new Date(Date.now() - UPLOAD_MAX_AGE_MS) } },
  });
  if (!upload) return fail("This upload has expired. Please choose the file again.");

  const stored = await headObject(key);
  if (!stored || stored.sizeBytes !== upload.sizeBytes) return fail("This file did not finish uploading. Please choose it again.");
  if (detectDocumentType(await readObjectStart(key, 8)) !== upload.contentType) {
    return fail("This file is not a real PDF, JPG or PNG. Please upload the original document.");
  }
  return upload;
}

// ───────────── Seller application ─────────────

const docField = (kind: SellerDocumentKindValue) => `doc_${kind}`;

const DETAIL_FIELDS = ["companyName", "contactName", "contactPhone", "contactEmail", "address", "city", "state"] as const;
const readDetails = (form: FormData) => ({
  ...Object.fromEntries(DETAIL_FIELDS.map((f) => [f, form.get(f) ?? ""])),
  description: String(form.get("description") ?? "") || undefined,
});

function checkPhone(phone: string) {
  if (!isValidPhoneNumber(phone)) throw new UserFacingError("Please correct the highlighted fields.", { contactPhone: "Enter a valid phone number." });
}

/** The name for the header's profile button when this member is a seller: the team made their login, so it has a username. */
export async function sellerLoginName(userId: string): Promise<string | null> {
  const user = await db().user.findUnique({ where: { id: userId }, select: { name: true, username: true } });
  return user?.username ? user.name : null;
}

export function getMySeller(userId: string) {
  return db().seller.findUnique({
    where: { userId },
    include: {
      documents: { select: { kind: true, fileName: true } },
      statusChanges: { orderBy: { createdAt: "desc" }, select: { toStatus: true, reason: true, createdAt: true } },
    },
  });
}

/**
 * Saves the company verification form as a draft: nothing goes to the team until sendForApproval. Works from no
 * seller yet, a draft (made here, or by the first product: products.ts → ensureListingSeller) or a rejection.
 * Documents are optional (client, 2026-10-15; SELLER_DOCUMENTS keeps a `required` flag should that change); saving
 * again keeps any document not replaced.
 */
export async function saveCompanyDetails(member: Member, form: FormData): Promise<void> {
  const parsed = sellerApplicationSchema.safeParse(readDetails(form));
  if (!parsed.success) throw new UserFacingError("Please correct the highlighted fields.", fieldErrors(parsed.error));
  const details = parsed.data;
  checkPhone(details.contactPhone);

  const existing = await db().seller.findUnique({ where: { userId: member.id }, select: { id: true, status: true } });
  if (existing && !mayEditApplication(existing.status)) throw new UserFacingError("You have already applied. Check your seller page for its status.");

  const keys = new Map<SellerDocumentKindValue, string>();
  const missing: Record<string, string> = {};
  for (const { kind, required } of SELLER_DOCUMENTS) {
    const key = String(form.get(docField(kind)) ?? "");
    if (key) keys.set(kind, key);
    else if (required && !existing) missing[docField(kind)] = `Upload your ${documentLabel(kind)}.`;
  }
  if (Object.keys(missing).length) throw new UserFacingError("Please upload every document.", missing);

  const uploads = new Map<SellerDocumentKindValue, VerifiedUpload>();
  for (const [kind, key] of keys) uploads.set(kind, await verifyUpload(member, key, docField(kind)));

  const replacedKeys: string[] = [];
  await db().$transaction(async (tx) => {
    // The web address follows the company name until the team has it; never public before approval.
    const slugFor = () =>
      uniqueSlug(details.companyName, "seller", async (prefix) =>
        (await tx.seller.findMany({ where: { slug: { startsWith: prefix }, id: { not: existing?.id } }, select: { slug: true } })).map((s) => s.slug),
      );
    let sellerId: string;
    if (existing) {
      const slug = existing.status === "DRAFT" ? await slugFor() : undefined;
      // Conditional: if staff changed the status meanwhile, nothing is overwritten.
      const { count } = await tx.seller.updateMany({ where: { id: existing.id, status: existing.status }, data: { ...details, slug, detailsSavedAt: new Date() } });
      if (count === 0) throw new UserFacingError("Your application changed while you were editing it. Reload the page.");
      sellerId = existing.id;
    } else {
      sellerId = (await tx.seller.create({ data: { ...details, userId: member.id, slug: await slugFor(), status: "DRAFT", detailsSavedAt: new Date() }, select: { id: true } })).id;
    }

    for (const [kind, upload] of uploads) {
      const { count } = await tx.upload.updateMany({ where: { key: upload.key, claimedAt: null }, data: { claimedAt: new Date() } });
      if (count === 0) throw new UserFacingError("Please check the highlighted documents.", { [docField(kind)]: "This upload was already used. Choose the file again." });
      const previous = await tx.sellerDocument.findUnique({ where: { sellerId_kind: { sellerId, kind: kind as SellerDocumentKind } } });
      const data = { storageKey: upload.key, fileName: upload.fileName, contentType: upload.contentType, sizeBytes: upload.sizeBytes };
      if (previous) {
        replacedKeys.push(previous.storageKey);
        await tx.sellerDocument.update({ where: { id: previous.id }, data });
      } else {
        await tx.sellerDocument.create({ data: { ...data, sellerId, kind: kind as SellerDocumentKind } });
      }
    }
  }).catch((error: unknown) => {
    // Two first saves at once: the one-seller-per-account constraint stops the second.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new UserFacingError("Your application changed while you were editing it. Reload the page.");
    }
    throw error;
  });

  // Replaced documents are no longer referenced; remove the files. A failure here loses nothing.
  for (const key of replacedKeys) await deleteObject(key).catch((error: unknown) => logError(error, { replacedKey: key }));
}

/**
 * Sends the company details and products to the team, together (client, 2026-10-30): both must be there. The
 * status, history and team alert are written in one transaction; the team then approves both with one decision.
 */
export async function sendForApproval(member: Member): Promise<void> {
  const seller = await db().seller.findUnique({
    where: { userId: member.id },
    select: { id: true, status: true, detailsSavedAt: true, _count: { select: { products: { where: { removedAt: null } } } } },
  });
  if (!seller?.detailsSavedAt) throw new UserFacingError("Fill in your company details first.");
  if (!mayEditApplication(seller.status)) throw new UserFacingError("You have already applied. Check your seller page for its status.");
  if (seller._count.products === 0) throw new UserFacingError("Add at least one product first.");

  const boss = await getBoss();
  await db().$transaction(async (tx) => {
    const { count } = await tx.seller.updateMany({ where: { id: seller.id, status: seller.status }, data: { status: "PENDING" } });
    if (count === 0) throw new UserFacingError("Your application changed while you were editing it. Reload the page.");
    const change = await tx.sellerStatusChange.create({
      data: { sellerId: seller.id, fromStatus: seller.status === "REJECTED" ? "REJECTED" : null, toStatus: "PENDING", actorId: member.id },
      select: { id: true },
    });
    await enqueueInTransaction(boss, tx, QUEUES.sellerApplicationAlert, { changeId: change.id } satisfies SellerChangeJob);
  });
}

/**
 * The seller's own profile edits on their dashboard (2026-10-27): contact, address and description, saved at once
 * without a new review. The company name and documents go through company verification.
 */
export async function updateSellerProfile(member: Member, form: FormData): Promise<void> {
  const parsed = sellerProfileSchema.safeParse(readDetails(form));
  if (!parsed.success) throw new UserFacingError("Please correct the highlighted fields.", fieldErrors(parsed.error));
  checkPhone(parsed.data.contactPhone);
  const { count } = await db().seller.updateMany({
    where: { userId: member.id },
    data: { ...parsed.data, description: parsed.data.description ?? null }, // an emptied description is cleared
  });
  if (count === 0) throw new UserFacingError("Send your company verification first.");
}

// ───────────── Staff ─────────────

export const SELLERS_PAGE_SIZE = 25;
const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const sellerListParamsSchema = z.object({
  status: z.preprocess(first, z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional()).catch(undefined),
  q: z.preprocess(first, z.string().trim().max(100).optional()).catch(undefined),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(100_000).default(1)).catch(1),
});
export type SellerListParams = z.infer<typeof sellerListParamsSchema>;

export async function listSellers(params: SellerListParams) {
  const where: Prisma.SellerWhereInput = {
    status: params.status ?? { not: "DRAFT" }, // the team sees a seller once it is sent for approval
    ...(params.q && {
      OR: [
        { companyName: { contains: params.q, mode: "insensitive" } },
        { contactName: { contains: params.q, mode: "insensitive" } },
        { city: { contains: params.q, mode: "insensitive" } },
      ],
    }),
  };
  const [total, items] = await db().$transaction([
    db().seller.count({ where }),
    db().seller.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (params.page - 1) * SELLERS_PAGE_SIZE,
      take: SELLERS_PAGE_SIZE,
      select: { id: true, companyName: true, city: true, state: true, status: true, updatedAt: true },
    }),
  ]);
  return { total, items, pageCount: Math.max(1, Math.ceil(total / SELLERS_PAGE_SIZE)) };
}

export function getSellerForStaff(id: string) {
  if (!z.uuid().safeParse(id).success) return Promise.resolve(null);
  return db().seller.findUnique({
    where: { id },
    include: {
      user: { select: { phoneNumber: true, email: true } },
      documents: { orderBy: { kind: "asc" } },
      statusChanges: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true, role: true } } } },
    },
  });
}

const decisionSchema = z.object({
  sellerId: z.uuid(),
  decision: z.enum(SELLER_DECISION_NAMES, { error: "Choose a decision." }),
  reason: z.string().trim().max(1000, "Keep the reason to 1000 characters or fewer.").optional(),
});

/**
 * Approve, reject, suspend or reinstate. The status only moves along an allowed path (see
 * SELLER_DECISIONS), and who decided, when and why is recorded with the change, atomically.
 */
export async function decideSeller(input: Record<string, unknown>, actor: StaffUser): Promise<void> {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError("Please correct the highlighted fields.", fieldErrors(parsed.error));
  const { sellerId, decision, reason } = parsed.data;
  const rule = SELLER_DECISIONS[decision];
  if (rule.needsReason && !reason) throw new UserFacingError("Please give a reason.", { reason: "A reason is required for this decision. The seller will see it." });

  const boss = await getBoss();
  await db().$transaction(async (tx) => {
    const seller = await tx.seller.findUnique({ where: { id: sellerId }, select: { status: true } });
    if (!seller) throw new UserFacingError("This seller no longer exists.");
    if (!(rule.from as readonly string[]).includes(seller.status)) {
      throw new UserFacingError(`A seller who is ${seller.status.toLowerCase()} cannot be given "${rule.label}". Reload the page.`);
    }
    const { count } = await tx.seller.updateMany({ where: { id: sellerId, status: seller.status }, data: { status: rule.to } });
    if (count === 0) throw new UserFacingError("Someone else changed this seller a moment ago. Reload the page.");
    const change = await tx.sellerStatusChange.create({
      data: { sellerId, fromStatus: seller.status, toStatus: rule.to, reason: reason || null, actorId: actor.id },
      select: { id: true },
    });
    await enqueueInTransaction(boss, tx, QUEUES.sellerDecision, { changeId: change.id } satisfies SellerChangeJob);
  });
}

export function getSellerDocument(id: string) {
  if (!z.uuid().safeParse(id).success) return Promise.resolve(null);
  return db().sellerDocument.findUnique({ where: { id }, select: { storageKey: true, fileName: true } });
}
