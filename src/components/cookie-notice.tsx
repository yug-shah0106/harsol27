import Link from "next/link";
import { cookies } from "next/headers";
import { dismissCookieNotice } from "@/app/(public)/cookie-actions";
import { COOKIE_NOTICE } from "@/lib/preferences";
import { Button } from "@/components/ui/button";

/**
 * Tells visitors which cookies we use, until they press OK. We only set essential ones (the sign-in
 * session, and remembering this notice and dark mode), so there is nothing to accept or refuse.
 * If that ever changes (analytics, ads), this must become a real choice, before those cookies are set.
 */
export async function CookieNotice() {
  if ((await cookies()).get(COOKIE_NOTICE)) return null;
  return (
    <section
      aria-label="Cookies"
      className="fixed inset-x-3 bottom-3 z-50 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-sm shadow-xl print:hidden sm:right-auto sm:bottom-6 sm:left-6 sm:max-w-md sm:flex-row sm:items-center"
    >
      <p className="text-muted-foreground">
        We only use essential cookies: to keep you signed in and remember your settings. No advertising or tracking cookies.{" "}
        <Link href="/privacy" className="font-medium text-primary underline">
          Privacy policy
        </Link>
      </p>
      <form action={dismissCookieNotice} className="shrink-0">
        <Button type="submit" className="rounded-full px-5">
          OK
        </Button>
      </form>
    </section>
  );
}
