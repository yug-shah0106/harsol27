/** Allowed document types → file extension used in storage keys. */
export const DOCUMENT_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
} as const;

export type DocumentContentType = keyof typeof DOCUMENT_TYPES;

const SIGNATURES: [DocumentContentType, number[]][] = [
  ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d]], // %PDF-
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
];

/**
 * The real type of a file from its first bytes ("magic numbers"). The browser's declared type and
 * the file name can be faked; these bytes cannot be without making the file unusable as that type.
 */
export function detectDocumentType(bytes: Uint8Array): DocumentContentType | null {
  for (const [type, signature] of SIGNATURES) {
    if (signature.every((byte, i) => bytes[i] === byte)) return type;
  }
  return null;
}

/** Allowed product photo types → extension of the uploaded original. */
export const PHOTO_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type PhotoContentType = keyof typeof PHOTO_TYPES;

/** Like detectDocumentType, for photos: JPEG, PNG or WebP ("RIFF....WEBP"). Needs the first 12 bytes. */
export function detectPhotoType(bytes: Uint8Array): PhotoContentType | null {
  const document = detectDocumentType(bytes);
  if (document === "image/jpeg" || document === "image/png") return document;
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP" ? "image/webp" : null;
}
