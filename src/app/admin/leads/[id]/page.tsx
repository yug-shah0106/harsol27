import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/lead-status";
import { requireStaff } from "@/server/authz";
import { getLead } from "@/server/leads";
import { canWrite } from "@/server/staff-policy";
import { changeLeadStatusAction } from "../actions";
import { categoryLabel, formatIst } from "../format";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  const staff = await requireStaff();
  const lead = await getLead((await params).id);
  if (!lead) notFound();

  const details: [string, React.ReactNode][] = [
    ["Phone", <a key="p" href={`tel:${lead.phone}`} className="text-primary underline">{lead.phone}</a>],
    ["Email", <a key="e" href={`mailto:${lead.email}`} className="text-primary underline">{lead.email}</a>],
    ["Business category", categoryLabel(lead.businessCategory)],
    ["Industry", lead.industry.name],
    ["Received", `${formatIst(lead.createdAt)} IST`],
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

      {canWrite(staff) ? (
        <section aria-labelledby="status-heading" className="flex max-w-xl flex-col gap-3">
          <h2 id="status-heading" className="text-lg font-semibold">
            Change status
          </h2>
          <ActionForm action={changeLeadStatusAction} className="flex flex-col gap-3" successMessage="Status updated.">
            <input type="hidden" name="leadId" value={lead.id} />
            <div className="flex flex-col gap-1">
              <Label htmlFor="new-status">New status</Label>
              <NativeSelect id="new-status" name="status" required defaultValue="" className="w-full">
                <NativeSelectOption value="" disabled>
                  Choose a status
                </NativeSelectOption>
                {LEAD_STATUSES.filter((s) => s !== lead.status).map((s) => (
                  <NativeSelectOption key={s} value={s}>
                    {LEAD_STATUS_LABELS[s]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
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
          {lead.statusChanges.map((change) => (
            <li key={change.id}>
              <p className="font-medium">
                {LEAD_STATUS_LABELS[change.fromStatus]} → {LEAD_STATUS_LABELS[change.toStatus]}
              </p>
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
