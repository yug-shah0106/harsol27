import "server-only";
import { redirect } from "next/navigation";
import { mayListProducts } from "@/lib/seller-status";
import { requireMember, SELLER_HOME_PATH } from "@/server/authz";
import { db } from "@/server/db";
import type { SellerAccount } from "@/server/products";

/**
 * For seller pages that need an approved seller (inquiries, subscription), or with `listing`, one who may manage
 * products (from the company verification on). Others go to the dashboard, which says why.
 */
export async function requireSellerPage(path: string, { listing = false } = {}) {
  const member = await requireMember(path);
  const seller = await db().seller.findUnique({
    where: { userId: member.id },
    select: { id: true, userId: true, status: true, paidUntil: true, companyName: true, slug: true },
  });
  if (!seller || !(listing ? mayListProducts(seller.status) : seller.status === "APPROVED")) redirect(SELLER_HOME_PATH);
  const account: SellerAccount = { id: seller.id, userId: seller.userId };
  return { member, seller, account };
}
