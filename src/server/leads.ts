import "server-only";
import { isValidPhoneNumber } from "libphonenumber-js/max";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { BUSINESS_CATEGORIES, fieldErrors, HONEYPOT_FIELD, leadSchema, type BusinessCategoryValue } from "@/lib/lead-schema";
import { LEAD_STATUSES } from "@/lib/lead-status";
import { parseUtm } from "@/lib/utm";
import { clientIpFrom } from "./client-ip";
import { db } from "./db";
import { env } from "./env";
import { UserFacingError } from "./errors";
import { enqueueLeadEmails, getBoss } from "./jobs";
import { logInfo } from "./log";
import { consumeRateLimit } from "./rate-limit";
import type { StaffUser } from "./staff-policy";

/** Per client IP. Generous enough for an office or mobile network sharing one address. */
export const LEAD_IP_RULE = { max: 10, windowSeconds: 60 * 60 };

const LEAD_FIELDS = ["fullName", "phone", "email", "businessCategory", "industryId"] as const;

/**
 * Public lead form submission. The server re-validates everything the browser checked, confirms
 * the industry exists and is active, then saves the lead and queues both emails in one transaction.
 * Email is sent later by the worker, so it can neither slow down nor fail the submission.
 */
export async function submitLead(form: FormData, headers: Headers): Promise<void> {
  // Bots that fill the hidden field get the normal success response, and nothing is saved.
  if (String(form.get(HONEYPOT_FIELD) ?? "").trim() !== "") {
    logInfo("lead honeypot triggered");
    return;
  }

  const ip = clientIpFrom(headers, env().CLIENT_IP_HEADER);
  const limit = await consumeRateLimit(`lead:ip:${ip ?? "unknown"}`, LEAD_IP_RULE);
  if (!limit.allowed) {
    throw new UserFacingError(
      `Too many submissions from your network. Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    );
  }

  const parsed = leadSchema.safeParse(Object.fromEntries(LEAD_FIELDS.map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) throw new UserFacingError("Please correct the highlighted fields.", fieldErrors(parsed.error));
  const data = parsed.data;

  // The browser checks phone numbers with compact metadata; the server uses the full rules.
  if (!isValidPhoneNumber(data.phone)) {
    throw new UserFacingError("Please correct the highlighted fields.", { phone: "Enter a valid phone number, for example 98765 43210." });
  }

  const industry = await db().industry.findFirst({ where: { id: data.industryId, isActive: true }, select: { id: true } });
  if (!industry) {
    throw new UserFacingError("Please correct the highlighted fields.", { industryId: "Choose an industry from the list." });
  }

  const boss = await getBoss();
  await db().$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: { ...data, sourceIp: ip, userAgent: headers.get("user-agent")?.slice(0, 512) ?? null, utm: parseUtm(form.get("utm")) ?? undefined },
      select: { id: true },
    });
    await enqueueLeadEmails(boss, tx, lead.id);
  });
}

// ───────────── Staff: list, view, change status ─────────────

export const LEADS_PAGE_SIZE = 25;

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const categoryValues = BUSINESS_CATEGORIES.map((c) => c.value) as [BusinessCategoryValue, ...BusinessCategoryValue[]];

/** URL search params → safe filters. Anything malformed silently falls back to "no filter". */
export const leadListParamsSchema = z.object({
  status: z.preprocess(first, z.enum(LEAD_STATUSES).optional()).catch(undefined),
  industry: z.preprocess(first, z.uuid().optional()).catch(undefined),
  category: z.preprocess(first, z.enum(categoryValues).optional()).catch(undefined),
  q: z.preprocess(first, z.string().trim().max(100).optional()).catch(undefined),
  sort: z.preprocess(first, z.enum(["newest", "oldest", "name"]).default("newest")).catch("newest"),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(100_000).default(1)).catch(1),
});

export type LeadListParams = z.infer<typeof leadListParamsSchema>;

export async function listLeads(params: LeadListParams) {
  const where: Prisma.LeadWhereInput = {
    status: params.status,
    industryId: params.industry,
    businessCategory: params.category,
    ...(params.q && {
      OR: [
        { fullName: { contains: params.q, mode: "insensitive" } },
        { email: { contains: params.q.toLowerCase() } },
        { phone: { contains: params.q.replace(/[^\d+]/g, "") || params.q } },
      ],
    }),
  };
  const orderBy: Prisma.LeadOrderByWithRelationInput[] =
    params.sort === "name" ? [{ fullName: "asc" }, { id: "asc" }] : [{ createdAt: params.sort === "oldest" ? "asc" : "desc" }, { id: "asc" }];

  const [total, items] = await db().$transaction([
    db().lead.count({ where }),
    db().lead.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * LEADS_PAGE_SIZE,
      take: LEADS_PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        businessCategory: true,
        status: true,
        createdAt: true,
        industry: { select: { name: true } },
      },
    }),
  ]);
  return { total, items, pageCount: Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE)) };
}

export function getLead(id: string) {
  if (!z.uuid().safeParse(id).success) return Promise.resolve(null);
  return db().lead.findUnique({
    where: { id },
    include: {
      industry: { select: { name: true } },
      statusChanges: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
    },
  });
}

const statusChangeSchema = z.object({
  leadId: z.uuid(),
  status: z.enum(LEAD_STATUSES, { error: "Choose a status." }),
  note: z.string().trim().max(500, "Keep the note to 500 characters or fewer.").optional(),
});

/** Changes a lead's status and records who did it, when, from what and to what, atomically. */
export async function changeLeadStatus(input: Record<string, unknown>, actor: StaffUser): Promise<void> {
  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError("Please correct the highlighted fields.", fieldErrors(parsed.error));
  const { leadId, status, note } = parsed.data;

  await db().$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { status: true } });
    if (!lead) throw new UserFacingError("This lead no longer exists.");
    if (lead.status === status) throw new UserFacingError("The lead already has this status.", { status: "Choose a different status." });
    // Conditional update: if someone else changed the status since we read it, nothing happens.
    const { count } = await tx.lead.updateMany({ where: { id: leadId, status: lead.status }, data: { status } });
    if (count === 0) throw new UserFacingError("Someone else changed this lead a moment ago. Reload the page to see the latest status.");
    await tx.leadStatusChange.create({
      data: { leadId, fromStatus: lead.status, toStatus: status, note: note || null, actorId: actor.id },
    });
  });
}
