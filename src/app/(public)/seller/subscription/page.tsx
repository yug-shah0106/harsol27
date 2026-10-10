import type { Metadata } from "next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDay, formatRupees, REMINDER_DAYS, subscriptionState } from "@/lib/subscription";
import { getSellerContact } from "@/server/contact-access";
import { getMySubscriptionHistory } from "@/server/subscriptions";
import { indiaToday } from "@/server/visibility";
import { requireSellerPage } from "../seller-page";
import { SellerNav } from "../seller-nav";
import { SubscriptionStatus } from "../subscription-status";

export const metadata: Metadata = { title: "Subscription", robots: { index: false } };

export default async function SellerSubscriptionPage() {
  const { member, seller } = await requireSellerPage("/seller/subscription");
  const [history, contact] = await Promise.all([getMySubscriptionHistory(seller.id), getSellerContact({ kind: "member", id: member.id }, seller.id)]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <SellerNav />
      <h1 className="text-3xl font-extrabold tracking-tight">Subscription</h1>

      <SubscriptionStatus state={subscriptionState(seller.paidUntil, indiaToday())} paidUntil={seller.paidUntil} />

      <section aria-labelledby="renewal-heading" className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
        <h2 id="renewal-heading" className="text-lg font-semibold">
          How renewal works
        </h2>
        <p>Your Harsol27 subscription is yearly and is paid to the Harsol27 team, not on this website.</p>
        <p>
          We email reminders to <strong>{contact?.email ?? "your contact email"}</strong> {REMINDER_DAYS.join(", ").replace(/, (\d+)$/, " and $1")} days before your
          paid-until date. To renew, reply to one of those emails or contact the Harsol27 team. Your new date shows here as soon as it is recorded.
        </p>
      </section>

      <section aria-labelledby="payments-heading" className="flex flex-col gap-3">
        <h2 id="payments-heading" className="text-lg font-semibold">
          Payments recorded
        </h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground">None yet.</p>
        ) : (
          <div className="rounded-xl border border-border bg-card">
            <Table scrollLabel="Payments recorded">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Recorded</TableHead>
                  <TableHead scope="col">Paid until</TableHead>
                  <TableHead scope="col">Amount</TableHead>
                  <TableHead scope="col">Paid on</TableHead>
                  <TableHead scope="col">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{p.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" })}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDay(p.newPaidUntil)}</TableCell>
                    <TableCell>{p.amountPaise !== null ? formatRupees(p.amountPaise) : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.paidOn ? formatDay(p.paidOn) : "—"}</TableCell>
                    <TableCell>{p.reference ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
