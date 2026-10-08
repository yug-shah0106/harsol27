import sharp from "sharp";
import { PHOTO_WIDTHS, type PhotoWidth } from "@/lib/product-schema";
import { db } from "./db";
import { logError } from "./log";
import { photoKey } from "./photo-files";
import { deleteObject, getObjectBytes, putObject } from "./storage";

// Refuse "decompression bombs": a small file that expands to an enormous image.
const MAX_INPUT_PIXELS = 60_000_000;

/**
 * Turns an uploaded original into WebP at every PHOTO_WIDTHS width, then deletes the original.
 * Output carries no metadata (sharp strips EXIF, including GPS location, unless asked not to).
 *
 * Idempotent: a READY photo is skipped and re-running overwrites the same keys. A file that is not a
 * readable image is marked FAILED rather than retried forever; storage errors throw, so the queue retries.
 */
export async function processPhoto(photoId: string): Promise<"ready" | "failed" | "skipped"> {
  const photo = await db().productPhoto.findUnique({ where: { id: photoId }, select: { productId: true, status: true, uploadKey: true } });
  if (!photo || photo.status !== "PROCESSING" || !photo.uploadKey) return "skipped";

  const original = await getObjectBytes(photo.uploadKey);
  let outputs: { width: PhotoWidth; data: Buffer; actualWidth: number; actualHeight: number }[];
  try {
    const base = sharp(original, { limitInputPixels: MAX_INPUT_PIXELS }).rotate(); // apply EXIF orientation, then drop EXIF
    outputs = await Promise.all(
      PHOTO_WIDTHS.map(async (width) => {
        const { data, info } = await base
          .clone()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer({ resolveWithObject: true });
        return { width, data, actualWidth: info.width, actualHeight: info.height };
      }),
    );
  } catch (error) {
    logError(error, { photoId, step: "decode" });
    await db().productPhoto.update({ where: { id: photoId }, data: { status: "FAILED", uploadKey: null } });
    await deleteObject(photo.uploadKey);
    return "failed";
  }

  for (const output of outputs) await putObject(photoKey(photo.productId, photoId, output.width), output.data, "image/webp");
  const largest = outputs[outputs.length - 1]!;
  await db().productPhoto.update({
    where: { id: photoId },
    data: { status: "READY", uploadKey: null, width: largest.actualWidth, height: largest.actualHeight },
  });
  await deleteObject(photo.uploadKey);
  return "ready";
}
