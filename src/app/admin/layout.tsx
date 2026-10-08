import type { Metadata } from "next";
import { SkipLink, Wordmark } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/server/authz";
import { signOutAction } from "./actions";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Harsol27" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const staff = await requireStaff();

  return (
    <div className="flex flex-1 flex-col">
      <SkipLink />
      <header className="flex items-center justify-between gap-4 bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Wordmark />
          <span className="text-sm text-muted-foreground">Admin</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">{staff.name}</span>
          <Badge variant="outline">{staff.role === "ADMIN" ? "Admin" : "Viewer"}</Badge>
          <form action={signOutAction}>
            <button type="submit" className="font-medium underline underline-offset-4">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <AdminNav />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
