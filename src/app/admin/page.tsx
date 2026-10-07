import Link from "next/link";
import { requireStaff } from "@/server/authz";
import { db } from "@/server/db";

export default async function AdminHomePage() {
  // Layouts don't re-run on every navigation, so each page checks access itself.
  const staff = await requireStaff();
  const [newLeads, totalLeads, activeIndustries] = await Promise.all([
    db().lead.count({ where: { status: "NEW" } }),
    db().lead.count(),
    db().industry.count({ where: { isActive: true } }),
  ]);

  const tiles = [
    { label: "New leads", value: newLeads, href: "/admin/leads?status=NEW" },
    { label: "All leads", value: totalLeads, href: "/admin/leads" },
    { label: "Active industries", value: activeIndustries, href: "/admin/industries" },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {staff.name}</h1>
        <p className="mt-1 text-muted-foreground">
          {staff.role === "ADMIN"
            ? "You have full access: you can view and change everything in the admin area."
            : "You have view-only access: you can see everything in the admin area but cannot change anything."}
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link href={tile.href} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 no-underline hover:border-primary">
              <span className="text-sm text-muted-foreground">{tile.label}</span>
              <span className="text-3xl font-bold">{tile.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
