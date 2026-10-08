import { notFound } from "next/navigation";
import { requireStaff } from "@/server/authz";
import { getSellerDocument } from "@/server/sellers";
import { presignDownload } from "@/server/storage";

export const dynamic = "force-dynamic";

/** Staff only: redirects to a 60-second link for one seller document. The bucket is never public. */
export async function GET(_request: Request, { params }: RouteContext<"/api/admin/documents/[id]">): Promise<Response> {
  await requireStaff();
  const document = await getSellerDocument((await params).id);
  if (!document) notFound();
  return new Response(null, {
    status: 302,
    headers: {
      Location: await presignDownload(document.storageKey, document.fileName),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
