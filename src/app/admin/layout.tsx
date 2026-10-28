import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Toran } from "@/components/festive";
import { I18nProvider } from "@/components/i18n";
import { Motion } from "@/components/motion";
import { initials, SkipLink, Wordmark } from "@/components/site-header";
import { MESSAGES } from "@/i18n";
import { requireStaff } from "@/server/authz";
import { signOutAction } from "./actions";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Harsol27" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const staff = await requireStaff();

  // The admin is English (shared pieces such as the dropdown read their texts from here).
  return (
    <I18nProvider locale="en" messages={MESSAGES.en}>
      <div className="flex flex-1 flex-col">
        <SkipLink />
        <Toran className="bg-card" />
        <header className="flex items-center justify-between gap-4 bg-card px-4 py-3 sm:px-6">
          <Wordmark />
          {/* Who is signed in: initials in a circle, then the name with Sign out beneath it. */}
          <div className="flex items-center gap-3">
            <span aria-hidden="true" title={staff.role === "ADMIN" ? "Admin" : "Viewer"} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initials(staff.name)}
            </span>
            <div className="flex min-w-0 flex-col items-start leading-tight">
              <span className="max-w-32 truncate text-sm font-semibold sm:max-w-none">{staff.name}</span>
              <form action={signOutAction}>
                <button type="submit" className="inline-flex h-6 items-center gap-1 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-primary">
                  <LogOut aria-hidden="true" className="size-3" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>
        <AdminNav />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
        <Suspense fallback={null}>
          <Motion smoothScroll={false} />
        </Suspense>
      </div>
    </I18nProvider>
  );
}
