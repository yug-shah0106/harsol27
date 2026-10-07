import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { UserFacingError } from "./errors";
import { canWrite, staffFromSession, type StaffUser } from "./staff-policy";

export const STAFF_SIGN_IN_PATH = "/staff/sign-in";

/** Session for this request, read from the database (no cookie cache), memoised per render. */
export const getSession = cache(async () => auth().api.getSession({ headers: await headers() }));

export async function getStaff(): Promise<StaffUser | null> {
  return staffFromSession(await getSession(), new Date());
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
