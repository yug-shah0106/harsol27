import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { baseEnv } from "./env";

/**
 * Seller contact details are left out of every query by default, and the types follow: code that
 * has not explicitly asked for them cannot even read them. The only places allowed to ask are
 * listed in contact-access.guard.test.ts; contact-access.ts is the one that decides who may see them.
 */
export const OMIT = { seller: { contactPhone: true, contactEmail: true } } as const;

export type Db = PrismaClient<never, typeof OMIT>;

const globalForPrisma = globalThis as unknown as { prisma?: Db };

/**
 * The process-wide Prisma client. A function rather than a constant so that `next build`, which
 * imports route modules without any secrets present, never tries to read DATABASE_URL.
 */
export function db(): Db {
  globalForPrisma.prisma ??= new PrismaClient({
    // ponytail: 5 connections per process (the website and the worker each have one, plus pg-boss's own)
    // keeps both under Aiven's free plan limit of 20; raise it with a bigger database plan.
    adapter: new PrismaPg({ connectionString: baseEnv().DATABASE_URL, max: 5 }),
    omit: OMIT,
    // Prisma waits 2 s for a connection by default. On Render's free plan (a tenth of a CPU) the first page
    // after waking took longer, and the admin overview failed with P2028 (2026-10-21).
    transactionOptions: { maxWait: 10_000, timeout: 15_000 },
  });
  return globalForPrisma.prisma;
}
