import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SELLER_DOCUMENTS } from "@/lib/seller-schema";
import { decisionsFor, SELLER_DECISIONS, SELLER_STATUS_LABELS } from "@/lib/seller-status";
import { requireStaff } from "@/server/authz";
import { getSellerContact } from "@/server/contact-access";
import { getSellerForStaff } from "@/server/sellers";
import { canWrite } from "@/server/staff-policy";
import { formatIst } from "../../leads/format";
import { decideSellerAction } from "../actions";

export const metadata: Metadata = { title: "Seller" };

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`);

export default async function SellerReviewPage({ params }: PageProps<"/admin/sellers/[id]">) {
  const staff = await requireStaff();
  const seller = await getSellerForStaff((await params).id);
  if (!seller) notFound();
  const decisions = decisionsFor(seller.status);
  const contact = await getSellerContact({ kind: "staff" }, seller.id);

  const details: [string, React.ReactNode][] = [
    ["Contact person", seller.contactName],
    ["Contact phone", contact ? <a key="p" href={`tel:${contact.phone}`} className="text-primary underline">{contact.phone}</a> : "—"],
    ["Contact email", contact ? <a key="e" href={`mailto:${contact.email}`} className="text-primary underline">{contact.email}</a> : "—"],
    ["Signed in with", seller.user.phoneNumber ?? "—"],
    ["Address", `${seller.address ?? ""}, ${seller.city}, ${seller.state}`],
    ["About", seller.description || "—"],
    ["Applied", `${formatIst(seller.createdAt)} IST`],
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/admin/sellers" className="w-fit text-sm text-primary underline">
          ← All sellers
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{seller.companyName}</h1>
          <Badge>{SELLER_STATUS_LABELS[seller.status]}</Badge>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-[max-content_1fr]">
        {details.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-sm text-muted-foreground">{term}</dt>
            <dd className="break-words whitespace-pre-line">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="docs-heading" className="flex flex-col gap-3">
        <h2 id="docs-heading" className="text-lg font-semibold">
          Documents
        </h2>
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
          {SELLER_DOCUMENTS.map(({ kind, label }) => {
            const doc = seller.documents.find((d) => d.kind === kind);
            return (
              <li key={kind} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">{label}</span>
                {doc ? (
                  <span className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {doc.fileName} · {formatSize(doc.sizeBytes)}
                    </span>
                    {/* Not prefetched: each click mints a fresh 60-second link. */}
                    <a href={`/api/admin/documents/${doc.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">
                      Open<span className="sr-only"> {label} (opens in a new tab)</span>
                    </a>
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Not provided</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {canWrite(staff) ? (
        // Always rendered, so the confirmation stays visible after a decision that leaves none available.
        <section aria-labelledby="decision-heading" className="flex max-w-xl flex-col gap-3">
          <h2 id="decision-heading" className="text-lg font-semibold">
            Decision
          </h2>
          <ActionForm action={decideSellerAction} className="flex flex-col gap-3" successMessage="Decision saved. The seller will be emailed.">
            <input type="hidden" name="sellerId" value={seller.id} />
            {decisions.length > 0 ? (
              <>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="reason">Reason (required to reject or suspend; the seller sees it)</Label>
                  <Textarea id="reason" name="reason" maxLength={1000} rows={3} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {decisions.map((d) => (
                    <SubmitButton key={d} name="decision" value={d} variant={d === "reject" || d === "suspend" ? "destructive" : "default"}>
                      {SELLER_DECISIONS[d].label}
                    </SubmitButton>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Nothing to decide now. The seller can correct their application and apply again.</p>
            )}
          </ActionForm>
        </section>
      ) : (
        <p className="rounded-lg border border-border bg-secondary p-3 text-sm">You have view-only access.</p>
      )}

      <section aria-labelledby="history-heading" className="flex flex-col gap-3">
        <h2 id="history-heading" className="text-lg font-semibold">
          History
        </h2>
        <ol className="flex flex-col gap-3 border-l-2 border-border pl-4">
          {seller.statusChanges.map((change) => (
            <li key={change.id}>
              <p className="font-medium">
                {change.fromStatus ? `${SELLER_STATUS_LABELS[change.fromStatus]} → ` : "Applied · "}
                {SELLER_STATUS_LABELS[change.toStatus]}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatIst(change.createdAt)} IST · by {change.actor.role === "MEMBER" ? "the seller" : change.actor.name}
              </p>
              {change.reason && <p className="mt-1 whitespace-pre-line">Reason: {change.reason}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
