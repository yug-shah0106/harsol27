import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_DECISION_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/lead-status";
import { leadIndustryName, suggestUsername } from "@/lib/lead-schema";
import { pickUtm } from "@/lib/utm";
import { requireStaff } from "@/server/authz";
import { getLead } from "@/server/leads";
import { openPassword } from "@/server/member-logins";
import { canWrite } from "@/server/staff-policy";
import { changeLeadStatusAction } from "../actions";
import { LeadDecision } from "../decision";
import { LeadLogin } from "./login";
import { categoryLabel, formatIst, subscriptionText } from "../format";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  const staff = await requireStaff();
  const lead = await getLead((await params).id);
  if (!lead) notFound();

  const utm = lead.utm && typeof lead.utm === "object" ? pickUtm((key) => (lead.utm as Record<string, unknown>)[key]) : null;
  const details: [string, React.ReactNode][] = [
    ["Approval", <LeadDecision key="d" lead={lead} canDecide={canWrite(staff)} />],
    ["Subscription", subscriptionText(lead)],
    ["WhatsApp number", <a key="p" href={`tel:${lead.phone}`} className="text-primary underline">{lead.phone}</a>],
    ["Email", <a key="e" href={`mailto:${lead.email}`} className="text-primary underline">{lead.email}</a>],
    ["Father's name", lead.fatherName ?? "Not given"],
    ["Native place", lead.nativePlace ?? "Not given"],
    ["Address", lead.address ?? "Not given"],
    ["City", lead.city ?? "Not given"],
    ["State", lead.state ?? "Not given"],
    ["Pincode", lead.pincode ?? "Not given"],
    ["Category", categoryLabel(lead.businessCategory)],
    ["Industry", leadIndustryName(lead)],
    // Stored only as http(s) addresses (lib/lead-schema.ts), so they are safe to link; opened in a new tab.
    ["Website", lead.website ? <ExternalLink key="w" href={lead.website} /> : "Not given"],
    ["Instagram", lead.instagram ? <ExternalLink key="i" href={`https://www.instagram.com/${lead.instagram}/`} label={`@${lead.instagram}`} /> : "Not given"],
    ["Google Maps", lead.mapsLink ? <ExternalLink key="m" href={lead.mapsLink} label="Open the map" /> : "Not given"],
    // Opens a 60-second storage link in a new tab (the page's CSP keeps storage images out of the page itself).
    ["Payment screenshot", lead.paymentProofKey ? <ExternalLink key="p" href={`/api/admin/leads/${lead.id}/payment-proof`} label="View the screenshot" /> : "Not added"],
    ["Received", `${formatIst(lead.createdAt)} IST`],
    ["Campaign", utm ? Object.entries(utm).map(([key, value]) => `${key.replace("utm_", "")}: ${value}`).join(" · ") : "Not from a campaign link"],
    ["Source IP", lead.sourceIp ?? "Not recorded"],
    ["Browser", lead.userAgent ?? "Not recorded"],
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/admin/leads" className="w-fit text-sm text-primary underline">
          ← All leads
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{lead.fullName}</h1>
          <Badge>{LEAD_STATUS_LABELS[lead.status]}</Badge>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-[max-content_1fr]">
        {details.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-sm text-muted-foreground">{term}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="login-heading" className="flex max-w-xl flex-col gap-3">
        <h2 id="login-heading" className="text-lg font-semibold">
          Seller login
        </h2>
        <LeadLogin
          leadId={lead.id}
          firstName={lead.firstName ?? lead.fullName}
          approved={lead.decision === "APPROVED"}
          login={lead.user && { username: lead.user.username, disabledAt: lead.user.disabledAt }}
          password={canWrite(staff) ? openPassword(lead.user?.issuedPassword) : null}
          suggestion={suggestUsername(lead)}
          canCreate={canWrite(staff)}
        />
      </section>

      {canWrite(staff) ? (
        <section aria-labelledby="status-heading" className="flex max-w-xl flex-col gap-3">
          <h2 id="status-heading" className="text-lg font-semibold">
            Change status
          </h2>
          <ActionForm action={changeLeadStatusAction} className="flex flex-col gap-3" successMessage="Status updated.">
            <input type="hidden" name="leadId" value={lead.id} />
            <div className="flex flex-col gap-1">
              <Label htmlFor="new-status">New status</Label>
              <Dropdown
                id="new-status"
                name="status"
                required
                placeholder="Choose a status"
                className="w-full"
                options={LEAD_STATUSES.filter((s) => s !== lead.status).map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea id="note" name="note" maxLength={500} rows={3} />
            </div>
            <SubmitButton className="w-fit" pendingLabel="Saving…">
              Save status
            </SubmitButton>
          </ActionForm>
        </section>
      ) : (
        <p className="rounded-lg border border-border bg-secondary p-3 text-sm">You have view-only access.</p>
      )}

      <section aria-labelledby="history-heading" className="flex flex-col gap-3">
        <h2 id="history-heading" className="text-lg font-semibold">
          Status history
        </h2>
        <ol className="flex flex-col gap-3 border-l-2 border-border pl-4">
          <li>
            <p className="font-medium">Lead received · {LEAD_STATUS_LABELS.NEW}</p>
            <p className="text-sm text-muted-foreground">{formatIst(lead.createdAt)} IST · from the website</p>
          </li>
          {/* Status changes and approval decisions, in the order they happened. */}
          {[
            ...lead.statusChanges.map((c) => ({ ...c, what: `${LEAD_STATUS_LABELS[c.fromStatus]} → ${LEAD_STATUS_LABELS[c.toStatus]}` })),
            ...lead.decisionChanges.map((c) => ({ ...c, note: null, what: `Approval: ${LEAD_DECISION_LABELS[c.fromDecision]} → ${LEAD_DECISION_LABELS[c.toDecision]}` })),
          ]
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map((change) => (
              <li key={change.id}>
                <p className="font-medium">{change.what}</p>
                <p className="text-sm text-muted-foreground">
                  {formatIst(change.createdAt)} IST · by {change.actor.name}
                </p>
                {change.note && <p className="mt-1 whitespace-pre-line">{change.note}</p>}
              </li>
            ))}
        </ol>
      </section>
    </div>
  );
}

function ExternalLink({ href, label }: { href: string; label?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-primary underline">
      {label ?? href}
    </a>
  );
}
