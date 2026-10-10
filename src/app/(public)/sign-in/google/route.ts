import { NextResponse, type NextRequest } from "next/server";
import { safeReturnPath } from "@/lib/return-path";
import { auth, googleSignInEnabled } from "@/server/auth";
import { ADD_MOBILE_PATH } from "@/server/authz";

/**
 * "Continue with Google" (GoogleButton links here): sends the browser to Google with Better Auth's
 * state cookie. A link rather than a form, because the CSP's form-action would block a form
 * submission that ends on google.com. Google comes back to /api/auth/callback/google.
 */
export async function GET(request: NextRequest) {
  if (!googleSignInEnabled()) return new NextResponse("Not found", { status: 404 });
  const next = safeReturnPath(request.nextUrl.searchParams.get("next"));
  const started = await auth().api.signInSocial({
    body: {
      provider: "google",
      // Every Google sign-in passes the mobile-number page, which moves straight on when there is one.
      callbackURL: `${ADD_MOBILE_PATH}?next=${encodeURIComponent(next)}`,
      errorCallbackURL: "/sign-in",
      disableRedirect: true,
    },
    headers: request.headers,
    asResponse: true,
  });
  const { url } = (await started.json()) as { url?: string };
  if (!started.ok || !url) throw new Error(`Google sign-in could not start (HTTP ${started.status})`);
  const response = NextResponse.redirect(url, 303);
  for (const cookie of started.headers.getSetCookie()) response.headers.append("set-cookie", cookie);
  return response;
}
