import "server-only";
import { db } from "./db";

export type RateLimitRule = { max: number; windowSeconds: number };
export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/**
 * Fixed-window counter, atomic in a single statement so concurrent requests cannot all slip through.
 * Keys look like "staff-login:ip:203.0.113.4".
 */
export async function consumeRateLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  // Prisma stores DateTime as UTC in `timestamp without time zone`, so compare against UTC
  // explicitly; bare now() would follow the database session's time zone.
  const rows = await db().$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, timezone('UTC', now()) + make_interval(secs => ${rule.windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimit"."resetAt" <= timezone('UTC', now()) THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= timezone('UTC', now()) THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;
  const row = rows[0];
  if (!row) throw new Error("rate limit upsert returned no row");
  const allowed = row.count <= rule.max;
  return {
    allowed,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000)),
  };
}
