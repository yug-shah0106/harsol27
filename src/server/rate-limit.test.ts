import { afterAll, describe, expect, it } from "vitest";
import { db } from "./db";
import { consumeRateLimit } from "./rate-limit";

const prefix = `test:${crypto.randomUUID()}`;

afterAll(async () => {
  await db().rateLimit.deleteMany({ where: { key: { startsWith: prefix } } });
  await db().$disconnect();
});

describe("consumeRateLimit (against Postgres)", () => {
  it("allows up to max requests in a window, then refuses with a retry time", async () => {
    const key = `${prefix}:basic`;
    const rule = { max: 3, windowSeconds: 60 };
    for (let i = 0; i < 3; i++) expect((await consumeRateLimit(key, rule)).allowed).toBe(true);
    const refused = await consumeRateLimit(key, rule);
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
    expect(refused.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("counts concurrent requests exactly (no lost updates)", async () => {
    const key = `${prefix}:concurrent`;
    const results = await Promise.all(Array.from({ length: 20 }, () => consumeRateLimit(key, { max: 5, windowSeconds: 60 })));
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });

  it("starts a fresh window once the old one has expired", async () => {
    const key = `${prefix}:expiry`;
    await db().rateLimit.create({ data: { key, count: 99, resetAt: new Date(Date.now() - 1000) } });
    expect((await consumeRateLimit(key, { max: 1, windowSeconds: 60 })).allowed).toBe(true);
  });

  it("keeps separate counters per key", async () => {
    const rule = { max: 1, windowSeconds: 60 };
    expect((await consumeRateLimit(`${prefix}:a`, rule)).allowed).toBe(true);
    expect((await consumeRateLimit(`${prefix}:b`, rule)).allowed).toBe(true);
  });
});
