import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LEAD_DECISION_LABELS } from "@/lib/lead-status";
import { requireStaff } from "@/server/authz";
import { leadsStamp, listUpiTransactions } from "@/server/leads";
import { formatIst } from "../leads/format";
import { LiveLeads } from "../live-leads";

export const metadata: Metadata = { title: "UPI transactions" };

export default async function UpiTransactionsPage() {
  await requireStaff();
  const [stamp, transactions] = await Promise.all([leadsStamp(), listUpiTransactions()]);

  return (
    <div className="flex flex-col gap-6">
      <LiveLeads stamp={stamp} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">UPI transactions</h1>
          <p className="mt-1 text-muted-foreground">The IDs sellers enter on the registration form, newest first. The download always has all of them.</p>
        </div>
        {/* A plain link: the route sends a file, not a page. */}
        <Button asChild>
          <a href="/api/admin/upi-transactions" download>
            <Download aria-hidden="true" /> Download
          </a>
        </Button>
      </div>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {transactions.length === 0 ? "No UPI transaction IDs yet." : `${transactions.length} ${transactions.length === 1 ? "transaction" : "transactions"}`}
      </p>

      {transactions.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">UPI transaction ID</TableHead>
                <TableHead scope="col">Name</TableHead>
                <TableHead scope="col">WhatsApp number</TableHead>
                <TableHead scope="col">Email</TableHead>
                <TableHead scope="col">Payment</TableHead>
                <TableHead scope="col">Received (IST)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.upiTransactionId}</TableCell>
                  <TableCell className="whitespace-normal">
                    <Link href={`/admin/leads/${lead.id}`} className="text-primary underline">
                      {lead.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{LEAD_DECISION_LABELS[lead.payment]}</TableCell>
                  <TableCell className="whitespace-pre-line">{formatIst(lead.createdAt).replace(", ", "\n")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
