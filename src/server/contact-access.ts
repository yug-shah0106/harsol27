import "server-only";
import { db } from "./db";

/**
 * THE single place that decides who may see a seller's phone number and email.
 *
 *   staff (admin or viewer) .................... yes
 *   the seller's own account ................... yes
 *   a buyer who has sent this seller an inquiry  yes  (sending one is what unlocks the contact)
 *   anyone else, including signed-out visitors . no
 *
 * The contact columns are omitted from every other query (see db.ts), and a guard test fails the
 * build if any other file asks for them, so nothing else can leak them to the browser.
 */

export type Viewer = { kind: "staff" } | { kind: "member"; id: string } | null;
export type SellerContact = { contactName: string; phone: string; email: string };

/** Pure rule, unit-tested on its own. */
export function mayViewContact(facts: { isStaff: boolean; isOwner: boolean; hasInquired: boolean }): boolean {
  return facts.isStaff || facts.isOwner || facts.hasInquired;
}

/** Contacts the viewer may see, for several sellers at once. Sellers they may not see are absent. */
export async function getSellerContacts(viewer: Viewer, sellerIds: string[]): Promise<Map<string, SellerContact>> {
  const contacts = new Map<string, SellerContact>();
  const ids = [...new Set(sellerIds)];
  if (!viewer || ids.length === 0) return contacts;

  let allowed: string[];
  if (viewer.kind === "staff") {
    allowed = ids;
  } else {
    const [owned, inquired] = await Promise.all([
      db().seller.findMany({ where: { id: { in: ids }, userId: viewer.id }, select: { id: true } }),
      db().inquiry.findMany({ where: { sellerId: { in: ids }, buyerId: viewer.id }, select: { sellerId: true }, distinct: ["sellerId"] }),
    ]);
    const ownedIds = new Set(owned.map((s) => s.id));
    const inquiredIds = new Set(inquired.map((i) => i.sellerId));
    allowed = ids.filter((id) => mayViewContact({ isStaff: false, isOwner: ownedIds.has(id), hasInquired: inquiredIds.has(id) }));
  }
  if (allowed.length === 0) return contacts;

  const rows = await db().seller.findMany({
    where: { id: { in: allowed } },
    select: { id: true, contactName: true, contactPhone: true, contactEmail: true },
  });
  for (const row of rows) contacts.set(row.id, { contactName: row.contactName, phone: row.contactPhone, email: row.contactEmail });
  return contacts;
}

export async function getSellerContact(viewer: Viewer, sellerId: string): Promise<SellerContact | null> {
  return (await getSellerContacts(viewer, [sellerId])).get(sellerId) ?? null;
}
