import { z } from "zod";
import { PHOTO_WIDTHS, type PhotoWidth } from "@/lib/product-schema";
import { getViewer } from "@/server/authz";
import { db } from "@/server/db";
import { photoKey } from "@/server/photo-files";
import { getObjectStream } from "@/server/storage";
import { publicProductWhere } from "@/server/visibility";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

/**
 * Serves one web-sized version of a product photo from private storage. Photos of public products
 * are cacheable by browsers and the CDN; anything else is only for its seller or staff, never cached.
 */
export async function GET(_request: Request, { params }: RouteContext<"/media/photos/[id]/[width]">): Promise<Response> {
  const { id, width } = await params;
  const size = Number(width.replace(/\.webp$/, ""));
  if (!z.uuid().safeParse(id).success || !PHOTO_WIDTHS.includes(size as PhotoWidth)) return notFound();

  const photo = await db().productPhoto.findFirst({
    where: { id, status: "READY" },
    select: { productId: true, product: { select: { seller: { select: { userId: true } } } } },
  });
  if (!photo) return notFound();

  const isPublic = (await db().product.count({ where: { AND: [{ id: photo.productId }, publicProductWhere()] } })) === 1;
  if (!isPublic) {
    const viewer = await getViewer();
    const allowed = viewer?.kind === "staff" || (viewer?.kind === "member" && viewer.id === photo.product.seller.userId);
    if (!allowed) return notFound();
  }

  const object = await getObjectStream(photoKey(photo.productId, id, size as PhotoWidth));
  if (!object?.body) return notFound();
  return new Response(object.body, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": object.headers.get("content-length") ?? "",
      // A photo id's files never change, so public copies can be cached for a year.
      "Cache-Control": isPublic ? "public, max-age=31536000, immutable" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
