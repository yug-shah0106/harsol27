import { PHOTO_WIDTHS, type PhotoWidth } from "@/lib/product-schema";
import { deleteObject } from "./storage";

/** Where each web-sized version of a photo lives. */
export function photoKey(productId: string, photoId: string, width: PhotoWidth): string {
  return `product-photos/${productId}/${photoId}/w${width}.webp`;
}

/** Removes every stored version of a photo. Missing files are fine. */
export async function deletePhotoFiles(productId: string, photoId: string, uploadKey: string | null): Promise<void> {
  const keys = PHOTO_WIDTHS.map((w) => photoKey(productId, photoId, w));
  if (uploadKey) keys.push(uploadKey);
  await Promise.all(keys.map((key) => deleteObject(key)));
}
