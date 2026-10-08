import "server-only";
import { redirect } from "next/navigation";
import { requireMember } from "@/server/authz";
import { db } from "@/server/db";
import type { SellerAccount } from "@/server/products";

/** For seller-dashboard pages: signed in, with an approved seller account; otherwise sent where they belong. */
export async function requireSellerPage(path: string) {
  const member = await requireMember(path);
  const seller = await db().seller.findUnique({
    where: { userId: member.id },
    select: { id: true, userId: true, status: true, paidUntil: true, companyName: true, slug: true },
  });
  if (!seller) redirect("/seller/apply");
  if (seller.status !== "APPROVED") redirect("/seller");
  const account: SellerAccount = { id: seller.id, userId: seller.userId };
  return { member, seller, account };
}
