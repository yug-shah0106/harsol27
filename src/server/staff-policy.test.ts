import { describe, expect, it } from "vitest";
import {
  afterFailedLogin,
  canWrite,
  isLocked,
  LOCKOUT_MINUTES,
  LOCKOUT_THRESHOLD,
  STAFF_SESSION_MAX_HOURS,
  staffFromSession,
} from "./staff-policy";

const now = new Date("2026-10-07T10:00:00Z");
const user = { id: "u1", name: "Asha", email: "asha@example.com", role: "ADMIN" as unknown, disabledAt: null };
const fresh = { createdAt: new Date(now.getTime() - 60_000) };

describe("afterFailedLogin", () => {
  it("does not lock below the threshold", () => {
    expect(afterFailedLogin(LOCKOUT_THRESHOLD - 1, now)).toEqual({ failedLoginCount: LOCKOUT_THRESHOLD - 1, lockedUntil: null });
  });

  it("locks for the lockout period at the threshold and restarts the count", () => {
    const result = afterFailedLogin(LOCKOUT_THRESHOLD, now);
    expect(result.failedLoginCount).toBe(0);
    expect(result.lockedUntil?.getTime()).toBe(now.getTime() + LOCKOUT_MINUTES * 60_000);
  });
});

describe("isLocked", () => {
  it("is locked only while lockedUntil is in the future", () => {
    expect(isLocked(null, now)).toBe(false);
    expect(isLocked(new Date(now.getTime() + 1), now)).toBe(true);
    expect(isLocked(now, now)).toBe(false);
  });
});

describe("staffFromSession", () => {
  it("accepts active admins and viewers", () => {
    expect(staffFromSession({ user, session: fresh }, now)?.role).toBe("ADMIN");
    expect(staffFromSession({ user: { ...user, role: "VIEWER" }, session: fresh }, now)?.role).toBe("VIEWER");
  });

  it("rejects no session, members, unknown roles and disabled staff", () => {
    expect(staffFromSession(null, now)).toBeNull();
    expect(staffFromSession({ user: { ...user, role: "MEMBER" }, session: fresh }, now)).toBeNull();
    expect(staffFromSession({ user: { ...user, role: "admin" }, session: fresh }, now)).toBeNull();
    expect(staffFromSession({ user: { ...user, role: undefined }, session: fresh }, now)).toBeNull();
    expect(staffFromSession({ user: { ...user, disabledAt: now }, session: fresh }, now)).toBeNull();
  });

  it("rejects staff sessions older than the staff session lifetime", () => {
    const old = { createdAt: new Date(now.getTime() - STAFF_SESSION_MAX_HOURS * 3_600_000 - 1) };
    expect(staffFromSession({ user, session: old }, now)).toBeNull();
  });

  it("never copies fields beyond id, name, email and role", () => {
    expect(Object.keys(staffFromSession({ user, session: fresh }, now) ?? {}).sort()).toEqual(["email", "id", "name", "role"]);
  });
});

describe("canWrite", () => {
  it("allows admins and refuses viewers", () => {
    expect(canWrite({ id: "1", name: "a", email: "a@b.c", role: "ADMIN" })).toBe(true);
    expect(canWrite({ id: "1", name: "a", email: "a@b.c", role: "VIEWER" })).toBe(false);
  });
});
