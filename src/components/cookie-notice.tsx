import Link from "next/link";
import { cookies } from "next/headers";
import { dismissCookieNotice } from "@/app/(public)/cookie-actions";
import { COOKIE_NOTICE } from "@/lib/preferences";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/server/locale";

/**
 * Tells visitors which cookies we use, until they press OK. We only set essential ones (the sign-in
 * session, and remembering this notice, dark mode and the language), so there is nothing to accept or refuse.
 * If that ever changes (analytics, ads), this must become a real choice, before those cookies are set.
 */
export async function CookieNotice() {
  if ((await cookies()).get(COOKIE_NOTICE)) return null;
  const t = await getMessages();
  return (
    <section
      aria-label={t.cookies.label}
      className="fixed inset-x-3 bottom-3 z-50 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-sm shadow-xl print:hidden sm:right-auto sm:bottom-6 sm:left-6 sm:max-w-md sm:flex-row sm:items-center"
    >
      <p className="text-muted-foreground">
        {t.cookies.text}{" "}
        <Link href="/privacy" className="font-medium text-primary underline">
          {t.cookies.policy}
        </Link>
      </p>
      <form action={dismissCookieNotice} className="shrink-0">
        <Button type="submit" className="rounded-full px-5">
          {t.cookies.ok}
        </Button>
      </form>
    </section>
  );
}
