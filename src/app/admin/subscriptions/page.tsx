import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDay, subscriptionState } from "@/lib/subscription";
import { requireStaff } from "@/server/authz";
import { countSubscriptionViews, listSubscriptions, SUBSCRIPTION_VIEWS, subscriptionListParamsSchema, type SubscriptionView } from "@/server/subscriptions";
import { indiaToday } from "@/server/visibility";
import { formatIst } from "../leads/format";

export const metadata: Metadata = { title: "Subscriptions" };

export default async function SubscriptionsPage({ searchParams }: PageProps<"/admin/subscriptions">) {
  await requireStaff();
  const params = subscriptionListParamsSchema.parse(await searchParams);
  const [{ items, total, pageCount }, counts] = await Promise.all([listSubscriptions(params), countSubscriptionViews()]);
  const today = indiaToday();

  const remaining = (paidUntil: Date | null) => {
    const state = subscriptionState(paidUntil, today);
    if (state.kind === "none") return "No payment yet";
    if (state.kind === "expired") return `Expired ${state.daysAgo} ${state.daysAgo === 1 ? "day" : "days"} ago`;
    return state.daysLeft === 0 ? "Last day today" : `${state.daysLeft} ${state.daysLeft === 1 ? "day" : "days"} left`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="mt-1 text-muted-foreground">
          Approved sellers by paid-until date. Open a seller to record a payment. Sellers get reminder emails 30, 7 and 1 days before their date.
        </p>
      </div>

      <nav aria-label="Subscription views">
        <ul className="flex flex-wrap gap-2">
          {(Object.keys(SUBSCRIPTION_VIEWS) as SubscriptionView[]).map((view) => (
            <li key={view}>
              <Button asChild variant={params.view === view ? "default" : "outline"} size="sm">
                <Link href={`/admin/subscriptions?view=${view}`} aria-current={params.view === view ? "page" : undefined}>
                  {SUBSCRIPTION_VIEWS[view]} ({counts[view]})
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      <form method="get" role="search" aria-label="Search subscriptions" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end">
        <input type="hidden" name="view" value={params.view} />
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="q">Search company</Label>
          <Input id="q" name="q" type="search" defaultValue={params.q ?? ""} maxLength={100} />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {total === 0 ? "No sellers here." : `${total} ${total === 1 ? "seller" : "sellers"}`}
      </p>

      {items.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Company</TableHead>
                <TableHead scope="col">City</TableHead>
                <TableHead scope="col">Paid until</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Last payment recorded (IST)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((seller) => (
                <TableRow key={seller.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/sellers/${seller.id}#subscription`} className="text-primary underline">
                      {seller.companyName}
                    </Link>
                  </TableCell>
                  <TableCell>{seller.city}</TableCell>
                  <TableCell className="whitespace-nowrap">{seller.paidUntil ? formatDay(seller.paidUntil) : "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{remaining(seller.paidUntil)}</TableCell>
                  <TableCell className="whitespace-nowrap">{seller.subscriptions[0] ? formatIst(seller.subscriptions[0].createdAt) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination basePath="/admin/subscriptions" params={{ view: params.view, q: params.q }} page={params.page} pageCount={pageCount} />
    </div>
  );
}
