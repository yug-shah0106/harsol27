import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { daysFromToday, makeIndustry, makeProduct, makeSeller } from "../../tests/factories";
import { db } from "./db";
import { indiaToday, publicProductWhere } from "./visibility";

afterAll(() => db().$disconnect());

describe("indiaToday", () => {
  it("uses the date in India, not UTC", () => {
    // 19:00 UTC on 7 Oct is 00:30 on 8 Oct in India.
    expect(indiaToday(new Date("2026-10-07T19:00:00Z")).toISOString()).toBe("2026-10-08T00:00:00.000Z");
    // 18:29 UTC is still 23:59 on 7 Oct in India.
    expect(indiaToday(new Date("2026-10-07T18:29:00Z")).toISOString()).toBe("2026-10-07T00:00:00.000Z");
  });
});

describe("publicProductWhere", () => {
  let industryId: string;
  let inactiveIndustryId: string;
  beforeAll(async () => {
    industryId = (await makeIndustry()).id;
    inactiveIndustryId = (await makeIndustry(false)).id;
  });

  async function isPublic(productId: string, now = new Date()) {
    return (await db().product.count({ where: { AND: [{ id: productId }, publicProductWhere(now)] } })) === 1;
  }

  it("shows a listed product of an approved seller whose paid-until date has not passed", async () => {
    const { seller } = await makeSeller();
    expect(await isPublic((await makeProduct(seller.id, industryId)).id)).toBe(true);
  });

  it("still shows it on the paid-until date itself, and hides it the day after (India time)", async () => {
    const { seller } = await makeSeller({ paidUntil: daysFromToday(0) });
    const product = await makeProduct(seller.id, industryId);
    expect(await isPublic(product.id)).toBe(true);
    const tomorrowInIndia = new Date(daysFromToday(1).getTime() - 5.5 * 3600_000 + 60_000); // 00:01 IST tomorrow
    expect(await isPublic(product.id, tomorrowInIndia)).toBe(false);
  });

  it.each([
    ["the seller never paid", { paidUntil: null }],
    ["the subscription expired yesterday", { paidUntil: daysFromToday(-1) }],
    ["the seller is pending", { status: "PENDING" as const }],
    ["the seller is suspended", { status: "SUSPENDED" as const }],
    ["the seller was rejected", { status: "REJECTED" as const }],
  ])("hides products when %s", async (_label, options) => {
    const { seller } = await makeSeller(options);
    expect(await isPublic((await makeProduct(seller.id, industryId)).id)).toBe(false);
  });

  it("hides products that are hidden by the seller, removed by staff, or in an inactive industry", async () => {
    const { seller } = await makeSeller();
    expect(await isPublic((await makeProduct(seller.id, industryId, { isHidden: true })).id)).toBe(false);
    expect(await isPublic((await makeProduct(seller.id, industryId, { removedAt: new Date() })).id)).toBe(false);
    expect(await isPublic((await makeProduct(seller.id, inactiveIndustryId)).id)).toBe(false);
  });
});
