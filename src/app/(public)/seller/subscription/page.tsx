import type { Metadata } from "next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fill, formatShortDate, HTML_LANG } from "@/lib/i18n";
import { formatRupees, REMINDER_DAYS, subscriptionState } from "@/lib/subscription";
import { getSellerContact } from "@/server/contact-access";
import { getLocale, getMessages } from "@/server/locale";
import { getMySubscriptionHistory } from "@/server/subscriptions";
import { indiaToday } from "@/server/visibility";
import { requireSellerPage } from "../seller-page";
import { SellerNav } from "../seller-nav";
import { SubscriptionStatus } from "../subscription-status";

export const metadata: Metadata = { title: "Subscription", robots: { index: false } };

export default async function SellerSubscriptionPage() {
  const { member, seller } = await requireSellerPage("/seller/subscription");
  const [history, contact] = await Promise.all([getMySubscriptionHistory(seller.id), getSellerContact({ kind: "member", id: member.id }, seller.id)]);
  const [locale, { sellerArea: s }] = [await getLocale(), await getMessages()];
  const day = (date: Date) => formatShortDate(date, locale);
  const days = REMINDER_DAYS.join(", ").replace(/, (\d+)$/, `${s.and}$1`);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <SellerNav />
      <h1 className="text-3xl font-extrabold tracking-tight">{s.subscription}</h1>

      <SubscriptionStatus state={subscriptionState(seller.paidUntil, indiaToday())} paidUntil={seller.paidUntil} />

      <section aria-labelledby="renewal-heading" className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
        <h2 id="renewal-heading" className="text-lg font-semibold">
          {s.renewalTitle}
        </h2>
        <p>{s.renewal}</p>
        <p>
          {fill(s.remindBefore, { days })}
          <strong>{contact?.email ?? s.yourEmail}</strong>
          {fill(s.remindAfter, { days })}
        </p>
      </section>

      <section aria-labelledby="payments-heading" className="flex flex-col gap-3">
        <h2 id="payments-heading" className="text-lg font-semibold">
          {s.payments}
        </h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground">{s.none}</p>
        ) : (
          <div className="rounded-xl border border-border bg-card">
            <Table scrollLabel={s.payments}>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{s.recorded}</TableHead>
                  <TableHead scope="col">{s.paidUntil}</TableHead>
                  <TableHead scope="col">{s.amount}</TableHead>
                  <TableHead scope="col">{s.paidOn}</TableHead>
                  <TableHead scope="col">{s.reference}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{p.createdAt.toLocaleDateString(HTML_LANG[locale], { timeZone: "Asia/Kolkata", dateStyle: "medium" })}</TableCell>
                    <TableCell className="whitespace-nowrap">{day(p.newPaidUntil)}</TableCell>
                    <TableCell>{p.amountPaise !== null ? formatRupees(p.amountPaise) : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.paidOn ? day(p.paidOn) : "—"}</TableCell>
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
