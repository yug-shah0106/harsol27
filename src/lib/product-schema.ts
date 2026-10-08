import { z } from "zod";
import { PHOTO_TYPES, type PhotoContentType } from "./file-type";

/** Client decisions, 2026-10-08. */
export const MAX_PHOTOS_PER_PRODUCT = 50;
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const MAX_SPECIFICATIONS = 30;

/** Widths the worker generates for every photo. Pages pick one with srcset. */
export const PHOTO_WIDTHS = [320, 800, 1600] as const;
export type PhotoWidth = (typeof PHOTO_WIDTHS)[number];

const noControlChars = /^[^\p{Cc}]*$/u;

export const specificationSchema = z.object({
  label: z.string().trim().min(1, "Enter a name for this detail.").max(60, "Keep it to 60 characters.").regex(noControlChars),
  value: z.string().trim().min(1, "Enter a value.").max(200, "Keep it to 200 characters.").regex(noControlChars),
});

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Enter a product name of at least 3 characters.")
    .max(120, "Keep the name to 120 characters or fewer.")
    .regex(noControlChars, "Remove line breaks from the name."),
  industryId: z.uuid({ error: "Choose an industry." }),
  description: z
    .string()
    .trim()
    .min(20, "Describe the product in at least 20 characters.")
    .max(5000, "Keep the description to 5000 characters or fewer."),
  specifications: z.array(specificationSchema).max(MAX_SPECIFICATIONS, `Up to ${MAX_SPECIFICATIONS} details.`),
});

export type ProductInput = z.infer<typeof productSchema>;
export type Specification = z.infer<typeof specificationSchema>;

/** Specification rows arrive as spec_label_0 / spec_value_0, …; fully empty rows are ignored. */
export function specificationsFromForm(form: FormData): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  for (let i = 0; i < MAX_SPECIFICATIONS + 5; i++) {
    const label = String(form.get(`spec_label_${i}`) ?? "");
    const value = String(form.get(`spec_value_${i}`) ?? "");
    if (label.trim() || value.trim()) rows.push({ label, value });
  }
  return rows;
}

/** Reads stored JSON back into typed rows, dropping anything malformed. */
export function parseSpecifications(json: unknown): Specification[] {
  const parsed = z.array(specificationSchema).safeParse(json);
  return parsed.success ? parsed.data : [];
}

const photoTypes = Object.keys(PHOTO_TYPES) as [PhotoContentType, ...PhotoContentType[]];

export const photoUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(photoTypes, { error: "Upload a JPG, PNG or WebP photo." }),
  sizeBytes: z.number().int().min(1, "This file is empty.").max(PHOTO_MAX_BYTES, "Photos must be 10 MB or smaller."),
});

export const inquirySchema = z.object({
  buyerName: z
    .string()
    .trim()
    .min(2, "Enter your name, so the seller knows who is asking.")
    .max(100, "Keep your name to 100 characters or fewer.")
    .regex(noControlChars, "Your name can only contain letters, spaces and punctuation."),
  message: z
    .string()
    .trim()
    .min(10, "Tell the seller what you need in at least 10 characters.")
    .max(2000, "Keep the message to 2000 characters or fewer."),
});
