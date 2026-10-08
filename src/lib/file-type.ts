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
