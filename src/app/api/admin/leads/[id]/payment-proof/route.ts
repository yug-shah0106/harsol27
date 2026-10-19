import { notFound } from "next/navigation";
import { requireStaff } from "@/server/authz";
import { getLead } from "@/server/leads";
import { presignDownload } from "@/server/storage";

export const dynamic = "force-dynamic";

/** Staff only: redirects to a 60-second link for a lead's payment screenshot. The bucket is never public. */
export async function GET(_request: Request, { params }: RouteContext<"/api/admin/leads/[id]/payment-proof">): Promise<Response> {
  await requireStaff();
  const lead = await getLead((await params).id);
  if (!lead?.paymentProofKey) notFound();
  return new Response(null, {
    status: 302,
    headers: {
      Location: await presignDownload(lead.paymentProofKey, lead.paymentProofName ?? "payment-screenshot"),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
