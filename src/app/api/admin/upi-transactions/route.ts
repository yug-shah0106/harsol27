import writeXlsxFile from "write-excel-file/node";
import { formatIst } from "@/app/admin/leads/format";
import { LEAD_DECISION_LABELS } from "@/lib/lead-status";
import { requireStaff } from "@/server/authz";
import { indiaDay, listUpiTransactions } from "@/server/leads";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { heading: "UPI transaction ID", width: 28 },
  { heading: "Name", width: 32 },
  { heading: "WhatsApp number", width: 18 },
  { heading: "Email", width: 32 },
  { heading: "Payment", width: 12 },
  { heading: "Received (IST)", width: 24 },
];

/**
 * Staff only: every UPI transaction ID as a spreadsheet, made from the database at each download so it is never
 * out of date. A real .xlsx, not a CSV: Excel shows a CSV's 12-digit IDs as 4.12346E+11, and would run a name typed
 * as a formula on the public form; here every cell is plain text.
 */
export async function GET(): Promise<Response> {
  await requireStaff();
  const rows = (await listUpiTransactions()).map((lead) => [lead.upiTransactionId, lead.fullName, lead.phone, lead.email, LEAD_DECISION_LABELS[lead.payment], formatIst(lead.createdAt)]);
  const headings = COLUMNS.map(({ heading }) => ({ value: heading, fontWeight: "bold" as const }));
  const file = await writeXlsxFile([headings, ...rows], { columns: COLUMNS.map(({ width }) => ({ width })) }).toBuffer();
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="harsol27-upi-transactions-${indiaDay(new Date())}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
