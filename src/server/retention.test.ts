import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./db";
import { purgeExpiredRequestMetadata, REQUEST_METADATA_RETENTION_DAYS } from "./retention";

const run = crypto.randomUUID().slice(0, 8);
const now = new Date("2026-10-08T00:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
let industryId: string;

async function lead(email: string, createdAt: Date) {
  return db().lead.create({
    data: { fullName: "R", phone: "+919876543210", email, businessCategory: "RETAIL", industryId, sourceIp: "203.0.113.1", userAgent: "ua", createdAt },
  });
}

beforeAll(async () => {
  industryId = (await db().industry.create({ data: { name: `Ret ${run}`, nameKey: `ret ${run}`, slug: `ret-${run}`, sortOrder: 9700 } })).id;
});

afterAll(() => db().$disconnect());

describe("purgeExpiredRequestMetadata", () => {
  it(`erases IP and browser details older than ${REQUEST_METADATA_RETENTION_DAYS} days and keeps the lead`, async () => {
    const old = await lead(`old.${run}@example.test`, daysAgo(REQUEST_METADATA_RETENTION_DAYS + 1));
    const recent = await lead(`recent.${run}@example.test`, daysAgo(REQUEST_METADATA_RETENTION_DAYS - 1));

    const first = await purgeExpiredRequestMetadata(now);
    expect(first.leads).toBeGreaterThanOrEqual(1);

    expect(await db().lead.findUniqueOrThrow({ where: { id: old.id } })).toMatchObject({ sourceIp: null, userAgent: null, fullName: "R" });
    expect(await db().lead.findUniqueOrThrow({ where: { id: recent.id } })).toMatchObject({ sourceIp: "203.0.113.1", userAgent: "ua" });

    // Running again changes nothing for rows already erased.
    const again = await purgeExpiredRequestMetadata(now);
    expect(await db().lead.findUniqueOrThrow({ where: { id: old.id } })).toMatchObject({ sourceIp: null });
    expect(again.leads).toBe(0);
  });
});
