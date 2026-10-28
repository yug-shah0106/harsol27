import "server-only";
import { redirect } from "next/navigation";
import { requireMember, SELLER_HOME_PATH } from "@/server/authz";
import { db } from "@/server/db";
import type { SellerAccount } from "@/server/products";

/** For the approved-only seller pages (products, inquiries, subscription): others go to the dashboard, which says why. */
export async function requireSellerPage(path: string) {
  const member = await requireMember(path);
  const seller = await db().seller.findUnique({
    where: { userId: member.id },
    select: { id: true, userId: true, status: true, paidUntil: true, companyName: true, slug: true },
  });
  if (seller?.status !== "APPROVED") redirect(SELLER_HOME_PATH);
  const account: SellerAccount = { id: seller.id, userId: seller.userId };
  return { member, seller, account };
}
