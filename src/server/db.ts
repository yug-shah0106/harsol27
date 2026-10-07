import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * The process-wide Prisma client. A function rather than a constant so that `next build`, which
 * imports route modules without any secrets present, never tries to read DATABASE_URL.
 */
export function db(): PrismaClient {
  globalForPrisma.prisma ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: env().DATABASE_URL }) });
  return globalForPrisma.prisma;
}
