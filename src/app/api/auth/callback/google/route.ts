import { auth, googleSignInEnabled } from "@/server/auth";

/**
 * Google's return address after "Continue with Google". The only Better Auth HTTP route the site
 * exposes (see server/auth.ts): it checks the state cookie, creates the member on first sign-in
 * and their session, then sends them on. Register <BETTER_AUTH_URL>/api/auth/callback/google with Google.
 */
export async function GET(request: Request) {
  if (!googleSignInEnabled()) return new Response("Not found", { status: 404 });
  return auth().handler(request);
}
