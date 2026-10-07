import type { Metadata } from "next";
import { requireStaff } from "@/server/authz";
import { signOutAction } from "./actions";

export const metadata: Metadata = { title: "Admin · Harsol27", robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const staff = await requireStaff();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-neutral-300 px-6 py-3">
        <span className="font-semibold">Harsol27 admin</span>
        <div className="flex items-center gap-4 text-sm">
          <span>
            {staff.name} <span className="rounded border border-neutral-500 px-1.5 py-0.5 text-xs">{staff.role === "ADMIN" ? "Admin" : "Viewer"}</span>
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="underline underline-offset-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
