import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeIndustry, makeMember, makeProduct, makeSeller } from "../../tests/factories";
import { getProductForPage, getPublicSeller, searchParamsSchema, searchProducts } from "./catalog";
import { getSellerContact } from "./contact-access";
import { db } from "./db";
import { UserFacingError } from "./errors";
import { getBoss, QUEUES } from "./jobs";
import { INQUIRY_RULES, listInquiries, sendInquiry } from "./inquiries";

const run = crypto.randomUUID().slice(0, 6);
let industry: { id: string; slug: string; name: string };
let visibleSeller: { id: string; slug: string };
let sellerOwnerId: string;
let product: { id: string; slug: string; name: string };
let hidden: { id: string; slug: string };

const headers = () => new Headers({ "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, "user-agent": "vitest" });

function inquiryForm(target: { productId?: string; sellerId?: string }, overrides: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...target, buyerName: "Ravi Shah", message: "Please share your price for 500 kg.", ...overrides })) fd.set(k, v);
  return fd;
}

beforeAll(async () => {
  industry = await makeIndustry();
  const made = await makeSeller();
  visibleSeller = made.seller;
  sellerOwnerId = made.owner.id;
  await db().seller.update({ where: { id: visibleSeller.id }, data: { city: "Morbi", companyName: `Morbi Tiles ${run}` } });
  product = await makeProduct(visibleSeller.id, industry.id, { name: `Vitrified floor tile ${run}`, description: "Glossy 600x600 vitrified tiles for floors." });
  hidden = await makeProduct(visibleSeller.id, industry.id, { name: `Hidden tile ${run}`, isHidden: true });
  const { seller: unpaid } = await makeSeller({ paidUntil: null });
  await makeProduct(unpaid.id, industry.id, { name: `Unpaid tile ${run}` });
});

afterAll(async () => {
  await (await getBoss()).stop({ graceful: false });
  await db().$disconnect();
});

describe("search", () => {
  const search = (q: Record<string, unknown>) => searchProducts(searchParamsSchema.parse(q));

  it("finds visible products by every word, in any order and case", async () => {
    const { items } = await search({ q: `TILE vitrified ${run}` });
    expect(items.map((p) => p.id)).toEqual([product.id]);
  });

  it("never returns hidden products or products of sellers who are not paid up", async () => {
    const { items } = await search({ q: run });
    expect(items.map((p) => p.id)).toEqual([product.id]);
  });

  it("filters by industry, state and city, and matches the seller's company name", async () => {
    expect((await search({ q: run, industry: industry.slug, state: "Gujarat", city: "morbi" })).total).toBe(1);
    expect((await search({ q: run, state: "Kerala" })).total).toBe(0);
    expect((await search({ q: `Morbi Tiles ${run}` })).total).toBe(1);
  });

  it("matches a word in the industry's name, but never through a seller who is not public", async () => {
    const industryWord = industry.name.split(" ")[1]!; // the factory's unique id part
    expect((await search({ q: `${industryWord} vitrified` })).items.map((p) => p.id)).toEqual([product.id]);
    const { seller: suspended } = await makeSeller({ status: "SUSPENDED" });
    await db().seller.update({ where: { id: suspended.id }, data: { companyName: `Hidden Ceramics ${run}` } });
    expect((await search({ q: `Hidden Ceramics ${run}` })).total).toBe(0);
  });

  it("returns only public-safe fields", async () => {
    const { items } = await search({ q: run });
    expect(Object.keys(items[0]!.seller).sort()).toEqual(["city", "companyName", "state"]);
  });
});

describe("product and seller pages", () => {
  it("hides a hidden product from the public but lets its seller and staff preview it", async () => {
    expect(await getProductForPage(hidden.slug, null)).toBeNull();
    expect(await getProductForPage(hidden.slug, { kind: "member", id: (await makeMember()).id })).toBeNull();
    expect(await getProductForPage(hidden.slug, { kind: "member", id: sellerOwnerId })).toMatchObject({ isPublic: false, isOwner: true });
    expect(await getProductForPage(hidden.slug, { kind: "staff" })).toMatchObject({ isPublic: false });
    expect(await getProductForPage(product.slug, null)).toMatchObject({ isPublic: true, name: product.name });
  });

  it("shows a public seller with only their visible products", async () => {
    const page = await getPublicSeller(visibleSeller.slug);
    expect(page?.products.map((p) => p.id)).toEqual([product.id]);
  });
});

describe("inquiries", () => {
  it("saves the inquiry, notifies the seller and unlocks the contact for that buyer", async () => {
    const buyer = await makeMember();
    expect(await getSellerContact({ kind: "member", id: buyer.id }, visibleSeller.id)).toBeNull();
    await sendInquiry(buyer, inquiryForm({ productId: product.id }), headers());

    const inquiry = await db().inquiry.findFirstOrThrow({ where: { buyerId: buyer.id } });
    expect(inquiry).toMatchObject({ sellerId: visibleSeller.id, productId: product.id, buyerName: "Ravi Shah", buyerPhone: buyer.phone, userAgent: "vitest" });
    const jobs = await db().$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pgboss.job WHERE name = ${QUEUES.inquiryNotification} AND data->>'inquiryId' = ${inquiry.id}`;
    expect(jobs[0]?.n).toBe(1);
    expect(await getSellerContact({ kind: "member", id: buyer.id }, visibleSeller.id)).not.toBeNull();
    expect((await db().user.findUniqueOrThrow({ where: { id: buyer.id } })).name).toBe("Ravi Shah");
  });

  it("works for a seller directly, without a product", async () => {
    const buyer = await makeMember();
    await sendInquiry(buyer, inquiryForm({ sellerId: visibleSeller.id }), headers());
    expect(await db().inquiry.count({ where: { buyerId: buyer.id, productId: null } })).toBe(1);
  });

  it("refuses hidden listings, unknown targets and the seller's own listing", async () => {
    const buyer = await makeMember();
    await expect(sendInquiry(buyer, inquiryForm({ productId: hidden.id }), headers())).rejects.toThrow(/no longer available/);
    await expect(sendInquiry(buyer, inquiryForm({ productId: crypto.randomUUID() }), headers())).rejects.toThrow(/no longer available/);
    await expect(sendInquiry(buyer, inquiryForm({}), headers())).rejects.toThrow(/could not be found/);
    await expect(sendInquiry({ id: sellerOwnerId, phone: "+919999999999" }, inquiryForm({ productId: product.id }), headers())).rejects.toThrow(/your own listing/);
    expect(await getSellerContact({ kind: "member", id: buyer.id }, visibleSeller.id)).toBeNull();
  });

  it("validates the name and message", async () => {
    const buyer = await makeMember();
    const error = await sendInquiry(buyer, inquiryForm({ productId: product.id }, { message: "hi", buyerName: "" }), headers()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UserFacingError);
    expect(Object.keys((error as UserFacingError).fields ?? {}).sort()).toEqual(["buyerName", "message"]);
  });

  it("has no daily cap, only a short-burst limit against automated harvesting", async () => {
    const buyer = await makeMember();
    for (let i = 0; i < INQUIRY_RULES.perBuyer.max; i++) await sendInquiry(buyer, inquiryForm({ productId: product.id }), headers());
    await expect(sendInquiry(buyer, inquiryForm({ productId: product.id }), headers())).rejects.toThrow(/a lot of inquiries in a short time/);
  });

  it("lists a seller's inquiries without IP details, and everyone's with them for staff", async () => {
    const forSeller = await listInquiries({ page: 1 }, { sellerId: visibleSeller.id });
    expect(forSeller.total).toBeGreaterThan(0);
    expect(forSeller.items[0]).not.toHaveProperty("sourceIp");
    const forStaff = await listInquiries({ page: 1, q: "Ravi" }, "all");
    expect(forStaff.items[0]).toHaveProperty("sourceIp");
  });
});
