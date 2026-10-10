"use server";

import { cookies } from "next/headers";
import { COOKIE_NOTICE } from "@/lib/preferences";

/** "OK" on the cookie notice: remembered for a year. A plain form post, so it works without JavaScript too. */
export async function dismissCookieNotice(): Promise<void> {
  (await cookies()).set(COOKIE_NOTICE, "ok", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
}
