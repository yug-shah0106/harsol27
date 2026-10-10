import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { safeReturnPath } from "@/lib/return-path";
import { auth, isPlaceholderEmail } from "./auth";
import type { Viewer } from "./contact-access";
import { UserFacingError } from "./errors";
import { canWrite, staffFromSession, type StaffUser } from "./staff-policy";

export const STAFF_SIGN_IN_PATH = "/staff/sign-in";

/** Session for this request, read from the database (no cookie cache), memoised per render. */
export const getSession = cache(async () => auth().api.getSession({ headers: await headers() }));

export async function getStaff(): Promise<StaffUser | null> {
  return staffFromSession(await getSession(), new Date());
}

/**
 * A signed-in buyer/seller. `phone` is what sellers receive with inquiries: the SMS-verified number
 * (phone accounts, before SMS was switched off) or the mobile typed at sign-up (not verified). Google
 * accounts have none until they add one. `email` is null for phone accounts (placeholder address).
 */
export type Member = { id: string; email: string | null; phone: string | null };
export type MemberWithPhone = Member & { phone: string };

export const ADD_MOBILE_PATH = "/account/mobile";

/** A signed-in buyer/seller. Staff sessions do not count. */
export async function getMember(): Promise<Member | null> {
  const data = await getSession();
  const user = data?.user as
    | { id: string; email: string; role?: unknown; phoneNumber?: string | null; mobile?: string | null; disabledAt?: Date | null }
    | undefined;
  if (!user || user.role !== "MEMBER" || user.disabledAt) return null;
  return { id: user.id, email: isPlaceholderEmail(user.email) ? null : user.email, phone: user.phoneNumber ?? user.mobile ?? null };
}

/**
 * For member pages and actions. `returnTo` must be a path on this site; it is where sign-in comes
 * back to. Members without a mobile number (Google sign-ups) are asked for one first, because
 * sellers get it with inquiries; only the page that collects it passes `{ phoneOptional: true }`.
 */
export async function requireMember(returnTo: string): Promise<MemberWithPhone>;
export async function requireMember(returnTo: string, options: { phoneOptional: true }): Promise<Member>;
export async function requireMember(returnTo: string, options?: { phoneOptional: true }): Promise<Member> {
  const member = await getMember();
  const next = encodeURIComponent(safeReturnPath(returnTo));
  if (!member) redirect(`/sign-in?next=${next}`);
  if (!member.phone && !options?.phoneOptional) redirect(`${ADD_MOBILE_PATH}?next=${next}`);
  return member;
}

/** Who is looking: staff, a signed-in member, or nobody. Used by contact-access.ts. */
export async function getViewer(): Promise<Viewer> {
  if (await getStaff()) return { kind: "staff" };
  const member = await getMember();
  return member ? { kind: "member", id: member.id } : null;
}

/** For staff pages and actions. Anyone who is not active staff is sent to the sign-in page. */
export async function requireStaff(): Promise<StaffUser> {
  const staff = await getStaff();
  if (!staff) redirect(STAFF_SIGN_IN_PATH);
  return staff;
}

/** For every staff action that changes data. Viewers are refused here, not just by hidden buttons. */
export async function requireAdmin(): Promise<StaffUser> {
  const staff = await requireStaff();
  if (!canWrite(staff)) throw new UserFacingError("Your account has view-only access.");
  return staff;
}
