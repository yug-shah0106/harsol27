import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { safeReturnPath } from "@/lib/return-path";
import { auth } from "./auth";
import type { Viewer } from "./contact-access";
import { UserFacingError } from "./errors";
import { canWrite, staffFromSession, type StaffUser } from "./staff-policy";

export const STAFF_SIGN_IN_PATH = "/staff/sign-in";

/** Session for this request, read from the database (no cookie cache), memoised per render. */
export const getSession = cache(async () => auth().api.getSession({ headers: await headers() }));

export async function getStaff(): Promise<StaffUser | null> {
  return staffFromSession(await getSession(), new Date());
}

export type Member = { id: string; phone: string };

/** A signed-in buyer/seller (phone account). Staff sessions do not count. */
export async function getMember(): Promise<Member | null> {
  const data = await getSession();
  const user = data?.user as { id: string; role?: unknown; phoneNumber?: string | null; disabledAt?: Date | null } | undefined;
  if (!user || user.role !== "MEMBER" || user.disabledAt || !user.phoneNumber) return null;
  return { id: user.id, phone: user.phoneNumber };
}

/** For member pages and actions. `returnTo` must be a path on this site; it is where sign-in comes back to. */
export async function requireMember(returnTo: string): Promise<Member> {
  const member = await getMember();
  if (!member) redirect(`/sign-in?next=${encodeURIComponent(safeReturnPath(returnTo))}`);
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
