import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeIndustry, makeMember, makeProduct, makeSeller } from "../../tests/factories";
import { getSellerContact, getSellerContacts, mayViewContact } from "./contact-access";
import { db } from "./db";

afterAll(() => db().$disconnect());

describe("mayViewContact (the rule)", () => {
  it.each([
    [{ isStaff: true, isOwner: false, hasInquired: false }, true],
    [{ isStaff: false, isOwner: true, hasInquired: false }, true],
    [{ isStaff: false, isOwner: false, hasInquired: true }, true],
    [{ isStaff: false, isOwner: false, hasInquired: false }, false],
  ])("%j → %s", (facts, expected) => {
    expect(mayViewContact(facts)).toBe(expected);
  });
});

describe("getSellerContact (against the database)", () => {
  let sellerId: string;
  let otherSellerId: string;
  let ownerId: string;
  let productId: string;

  beforeAll(async () => {
    const industry = await makeIndustry();
    const made = await makeSeller();
    sellerId = made.seller.id;
    ownerId = made.owner.id;
    otherSellerId = (await makeSeller()).seller.id;
    productId = (await makeProduct(sellerId, industry.id)).id;
  });

  it("gives nothing to a signed-out visitor or an unrelated buyer", async () => {
    expect(await getSellerContact(null, sellerId)).toBeNull();
    expect(await getSellerContact({ kind: "member", id: (await makeMember()).id }, sellerId)).toBeNull();
  });

  it("gives the contact to staff and to the seller's own account", async () => {
    expect(await getSellerContact({ kind: "staff" }, sellerId)).toMatchObject({ phone: "+919825011111", contactName: "Contact Person" });
    expect(await getSellerContact({ kind: "member", id: ownerId }, sellerId)).not.toBeNull();
  });

  it("unlocks a seller for a buyer once they have sent that seller an inquiry, and only that seller", async () => {
    const buyer = await makeMember();
    expect(await getSellerContact({ kind: "member", id: buyer.id }, sellerId)).toBeNull();
    await db().inquiry.create({ data: { buyerId: buyer.id, sellerId, productId, message: "Need 500 kg", buyerName: "B", buyerPhone: buyer.phone } });
    expect(await getSellerContact({ kind: "member", id: buyer.id }, sellerId)).not.toBeNull();
    expect(await getSellerContact({ kind: "member", id: buyer.id }, otherSellerId)).toBeNull();

    const many = await getSellerContacts({ kind: "member", id: buyer.id }, [sellerId, otherSellerId, sellerId]);
    expect([...many.keys()]).toEqual([sellerId]);
  });

  it("never returns contact details from ordinary queries", async () => {
    const row = await db().seller.findUniqueOrThrow({ where: { id: sellerId } });
    expect(row).not.toHaveProperty("contactPhone");
    expect(row).not.toHaveProperty("contactEmail");
  });
});
