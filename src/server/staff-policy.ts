// Pure staff-access rules, kept free of framework imports so they are unit-tested directly.

export type StaffRole = "ADMIN" | "VIEWER";
export type StaffUser = { id: string; name: string; email: string; role: StaffRole };

export const LOCKOUT_THRESHOLD = 5; // consecutive failed passwords
export const LOCKOUT_MINUTES = 15;
export const STAFF_SESSION_MAX_HOURS = 12;

export function isStaffRole(role: unknown): role is StaffRole {
  return role === "ADMIN" || role === "VIEWER";
}

export function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil > now;
}

/** After one more failure: lock once the threshold is reached, and restart the count. */
export function afterFailedLogin(failedLoginCount: number, now: Date): { failedLoginCount: number; lockedUntil: Date | null } {
  return failedLoginCount >= LOCKOUT_THRESHOLD
    ? { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + LOCKOUT_MINUTES * 60_000) }
    : { failedLoginCount, lockedUntil: null };
}

type SessionLike = {
  user: { id: string; name: string; email: string; role?: unknown; disabledAt?: Date | null };
  session: { createdAt: Date };
} | null;

/** A session counts as staff only for an active ADMIN/VIEWER within the staff session lifetime. */
export function staffFromSession(data: SessionLike, now: Date): StaffUser | null {
  if (!data) return null;
  const { user, session } = data;
  if (!isStaffRole(user.role) || user.disabledAt) return null;
  if (now.getTime() - session.createdAt.getTime() > STAFF_SESSION_MAX_HOURS * 3_600_000) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function canWrite(staff: StaffUser): boolean {
  return staff.role === "ADMIN";
}
