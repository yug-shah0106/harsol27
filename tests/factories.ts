// Test data builders for database tests. Each call creates fresh, uniquely named rows.
import type { Member, MemberWithPhone } from "../src/server/authz";
import { db } from "../src/server/db";
import type { StaffUser } from "../src/server/staff-policy";
import { indiaToday } from "../src/server/visibility";

const uid = () => crypto.randomUUID().slice(0, 8);
export const daysFromToday = (days: number) => new Date(indiaToday().getTime() + days * 86_400_000);

/** A buyer/seller account as made by the sign-up form: email, name and an (unverified) mobile. */
export async function makeMember(): Promise<MemberWithPhone> {
  const phone = `+9196${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
  const email = `member-${uid()}@example.test`;
  const user = await db().user.create({ data: { name: `Member ${uid()}`, email, mobile: phone } });
  return { id: user.id, email, phone };
}

export async function makeStaff(role: "ADMIN" | "VIEWER" = "ADMIN"): Promise<StaffUser> {
  const id = uid();
  const user = await db().user.create({ data: { name: `Staff ${id}`, email: `staff-${id}@example.test`, role } });
  return { id: user.id, name: user.name, email: user.email, role };
}

export async function makeIndustry(isActive = true) {
  const id = uid();
  return db().industry.create({ data: { name: `Industry ${id}`, nameKey: `industry ${id}`, slug: `industry-${id}`, sortOrder: 10_000, isActive } });
}

/** An approved seller, paid up for 30 days unless told otherwise. */
export async function makeSeller(options: { status?: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED"; paidUntil?: Date | null; owner?: Member } = {}) {
  const owner = options.owner ?? (await makeMember());
  const id = uid();
  const seller = await db().seller.create({
    data: {
      userId: owner.id,
      companyName: `Seller ${id}`,
      slug: `seller-${id}`,
      city: "Rajkot",
      state: "Gujarat",
      contactName: "Contact Person",
      contactPhone: "+919825011111",
      contactEmail: `seller-${id}@example.test`,
      status: options.status ?? "APPROVED",
      paidUntil: options.paidUntil === undefined ? daysFromToday(30) : options.paidUntil,
    },
  });
  return { seller, owner };
}

export async function makeProduct(sellerId: string, industryId: string, overrides: { name?: string; description?: string; isHidden?: boolean; removedAt?: Date | null } = {}) {
  const id = uid();
  return db().product.create({
    data: {
      sellerId,
      industryId,
      name: overrides.name ?? `Product ${id}`,
      slug: `product-${id}`,
      description: overrides.description ?? "A sturdy product made in Gujarat for business buyers.",
      isHidden: overrides.isHidden ?? false,
      removedAt: overrides.removedAt ?? null,
    },
  });
}
