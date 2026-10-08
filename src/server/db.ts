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
    adapter: new PrismaPg({ connectionString: baseEnv().DATABASE_URL }),
    omit: OMIT,
  });
  return globalForPrisma.prisma;
}
