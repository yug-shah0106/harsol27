"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { STAFF_SIGN_IN_PATH } from "@/server/authz";

export async function signOutAction(): Promise<void> {
  // Deletes the session row and clears the cookie; a no-op when already signed out.
  await auth().api.signOut({ headers: await headers() });
  redirect(STAFF_SIGN_IN_PATH);
}
