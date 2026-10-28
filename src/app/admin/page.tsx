import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Rangoli } from "@/components/festive";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { leadIndustryName } from "@/lib/lead-schema";
import { LEAD_DECISION_LABELS } from "@/lib/lead-status";
import { requireStaff } from "@/server/authz";
import { db } from "@/server/db";
import { countRecentInquiries } from "@/server/inquiries";
import { indiaDay, leadOverview, leadsStamp } from "@/server/leads";
import { countSubscriptionViews } from "@/server/subscriptions";
import { categoryLabel } from "./leads/format";
import { LiveLeads } from "./live-leads";

const IST = "Asia/Kolkata";
// The approval colours, as SVG fills and dots: green, red, and the toran's marigold for pending (it reads in
// both themes, where the accent token turns dark brown in dark mode).
// (Written out whole: Tailwind only builds classes it finds as literal text.)
const DECISION_FILL = { PENDING: "fill-[#f2a20c]", APPROVED: "fill-success", REJECTED: "fill-destructive" } as const;
const DECISION_DOT = { PENDING: "bg-[#f2a20c]", APPROVED: "bg-success", REJECTED: "bg-destructive" } as const;

export default async function AdminHomePage() {
  // Layouts don't re-run on every navigation, so each page checks access itself.
  const staff = await requireStaff();
  const now = new Date();
  const [stamp, leads, pendingSellers, inquiriesThisWeek, subscriptions] = await Promise.all([
    leadsStamp(),
    leadOverview(now),
    db().seller.count({ where: { status: "PENDING" } }),
    countRecentInquiries(7),
    countSubscriptionViews(),
  ]);

  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: IST }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: IST }).format(now);
  const thisWeek = leads.perDay.slice(-7).reduce((sum, d) => sum + d.count, 0);
  const pending = leads.byDecision.PENDING;
  const share = (n: number) => (leads.total ? Math.round((n / leads.total) * 100) : 0);

  return (
    <div className="flex flex-col gap-8">
      <LiveLeads stamp={stamp} />
      {/* Greeting: who, when, what access, and the one thing to do next. */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-linear-to-br from-accent/40 via-card to-card p-6 sm:p-8">
        {/* The rangoli whole, as on the home page, turning slowly (not with reduced motion); from 768px, beside the text. */}
        <div aria-hidden="true" className="absolute top-1/2 right-8 -z-10 hidden size-44 -translate-y-1/2 opacity-30 md:block lg:right-12 lg:size-48 dark:opacity-45">
          <Rangoli className="size-full motion-safe:animate-[spin_90s_linear_infinite]" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{today}</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-primary sm:text-4xl">
          {greeting}, {staff.name.split(" ")[0]}
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          {staff.role === "ADMIN"
            ? "You have full access: you can view and change everything in the admin area."
            : "You have view-only access: you can see everything in the admin area but cannot change anything."}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button asChild className="rounded-full">
            <Link href="/admin/leads?decision=PENDING">
              {pending ? `Review ${pending} pending ${pending === 1 ? "registration" : "registrations"}` : "Open seller registrations"}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          {leads.notContacted > 0 && (
            <Link href="/admin/leads?status=NEW" className="text-sm font-medium text-primary underline">
              {leads.notContacted} not contacted yet
            </Link>
          )}
        </div>
      </section>

      {/* Seller registrations: the total and the approval split. */}
      <section aria-labelledby="registrations-heading" className="flex flex-col gap-4">
        <h2 id="registrations-heading" className="text-lg font-semibold">
          Seller registrations
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard href="/admin/leads" label="All registrations" value={leads.total} note={`${thisWeek} in the last 7 days`} highlight />
          {(["PENDING", "APPROVED", "REJECTED"] as const).map((d) => (
            <StatCard
              key={d}
              href={`/admin/leads?decision=${d}`}
              label={LEAD_DECISION_LABELS[d]}
              value={leads.byDecision[d]}
              note={`${share(leads.byDecision[d])}% of all`}
              dot={DECISION_DOT[d]}
            />
          ))}
        </ul>
        {leads.total > 0 && (
          <svg viewBox="0 0 100 3" preserveAspectRatio="none" className="h-2.5 w-full overflow-hidden rounded-full" role="img" aria-label={`Approval split: ${share(leads.byDecision.APPROVED)}% approved, ${share(leads.byDecision.REJECTED)}% rejected, ${share(pending)}% pending`}>
            {(() => {
              let x = 0;
              return (["APPROVED", "PENDING", "REJECTED"] as const).map((d) => {
                const width = (leads.byDecision[d] / leads.total) * 100;
                const bar = <rect key={d} x={x} width={width} height={3} className={DECISION_FILL[d]} />;
                x += width;
                return bar;
              });
            })()}
          </svg>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* The last 14 days, a bar a day (India time); today in marigold. */}
        <section aria-labelledby="days-heading" className="min-w-0 rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="days-heading" className="font-semibold">
              Registrations, last 14 days
            </h2>
            <span className="text-sm text-muted-foreground">{leads.perDay.reduce((sum, d) => sum + d.count, 0)} in all</span>
          </div>
          <DayChart days={leads.perDay} />
        </section>

        {/* The ones waiting longest for a decision. */}
        <section aria-labelledby="waiting-heading" className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="waiting-heading" className="font-semibold">
              Waiting for approval
            </h2>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">{pending}</span>
          </div>
          {leads.waiting.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nothing waiting. All caught up.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-border">
              {leads.waiting.map((lead) => (
                <li key={lead.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/admin/leads/${lead.id}`} className="block truncate font-medium text-primary underline">
                      {lead.fullName}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">{[leadIndustryName(lead), lead.nativePlace ?? lead.city].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{waited(lead.createdAt, now)}</span>
                </li>
              ))}
            </ul>
          )}
          {pending > leads.waiting.length && (
            <Link href="/admin/leads?decision=PENDING&sort=oldest" className="mt-auto pt-3 text-sm font-medium text-primary underline">
              See all {pending} pending
            </Link>
          )}
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Breakdown title="Top native places" rows={leads.places.map((p) => ({ label: p.name, count: p.count }))} empty="No native places yet." />
        <Breakdown title="By category" rows={leads.categories.map((c) => ({ label: categoryLabel(c.value), count: c.count }))} empty="No registrations yet." />
      </div>

      {/* The marketplace: sellers, inquiries and their subscriptions. */}
      <section aria-labelledby="marketplace-heading" className="flex flex-col gap-3">
        <h2 id="marketplace-heading" className="text-lg font-semibold">
          Marketplace
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard small href="/admin/sellers?status=PENDING" label="Seller applications to review" value={pendingSellers} />
          <StatCard small href="/admin/inquiries" label="Inquiries in the last 7 days" value={inquiriesThisWeek} />
          <StatCard small href="/admin/subscriptions?view=expiring" label="Subscriptions expiring in 30 days" value={subscriptions.expiring} />
          <StatCard small href="/admin/subscriptions?view=unpaid" label="Approved sellers with no payment yet" value={subscriptions.unpaid} />
        </ul>
      </section>
    </div>
  );
}

/** One bar per day; the count above each bar that has any, the date under every other. */
function DayChart({ days }: { days: { day: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const label = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <svg viewBox={`0 0 ${days.length * 24} 112`} className="mt-4 h-auto w-full" role="img" aria-label={`Registrations per day: ${days.map((d) => `${label(d.day)} ${d.count}`).join(", ")}`}>
      <line x1={0} x2={days.length * 24} y1={90} y2={90} className="stroke-border" strokeWidth={0.5} />
      {days.map((d, i) => {
        const height = (d.count / max) * 72;
        const today = i === days.length - 1;
        return (
          <g key={d.day}>
            <rect x={i * 24 + 5} y={90 - Math.max(height, 1)} width={14} height={Math.max(height, 1)} rx={2} className={today ? DECISION_FILL.PENDING : d.count ? "fill-primary" : "fill-border"} />
            {d.count > 0 && (
              <text x={i * 24 + 12} y={86 - height} textAnchor="middle" fontSize={7} className="fill-foreground font-semibold">
                {d.count}
              </text>
            )}
            {(i % 2 === 1 || today) && (
              <text x={i * 24 + 12} y={104} textAnchor="middle" fontSize={6.5} className="fill-muted-foreground">
                {today ? "Today" : label(d.day)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Breakdown({ title, rows, empty }: { title: string; rows: { label: string; count: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.label} className="flex flex-col gap-1">
              <span className="flex justify-between gap-3 text-sm">
                <span className="truncate">{row.label}</span>
                <span className="font-semibold">{row.count}</span>
              </span>
              <svg viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full">
                <rect width={100} height={2} className="fill-secondary" />
                <rect width={(row.count / max) * 100} height={2} className="fill-primary" />
              </svg>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** How long a registration has waited, in India-time days. */
function waited(createdAt: Date, now: Date): string {
  const days = Math.round((Date.parse(indiaDay(now)) - Date.parse(indiaDay(createdAt))) / 86_400_000);
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days`;
}
