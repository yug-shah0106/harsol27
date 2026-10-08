import { z } from "zod";
import { DOCUMENT_TYPES, type DocumentContentType } from "./file-type";
import { phoneSchema } from "./lead-schema";

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
] as const;

/**
 * The documents a seller uploads when applying (client decisions, 2026-10-08). GST is optional:
 * businesses under the GST threshold do not have a certificate.
 */
export const SELLER_DOCUMENTS = [
  { kind: "GST_CERTIFICATE", label: "GST certificate", required: false },
  { kind: "PAN_CARD", label: "PAN card", required: true },
  { kind: "BUSINESS_REGISTRATION", label: "Udyam or business registration certificate", required: true },
  { kind: "ADDRESS_PROOF", label: "Address proof (for example an electricity bill)", required: true },
] as const;

export type SellerDocumentKindValue = (typeof SELLER_DOCUMENTS)[number]["kind"];
export const SELLER_DOCUMENT_KINDS = SELLER_DOCUMENTS.map((d) => d.kind) as [SellerDocumentKindValue, ...SellerDocumentKindValue[]];
export const documentLabel = (kind: string) => SELLER_DOCUMENTS.find((d) => d.kind === kind)?.label ?? kind;

/** Per-file limit for seller documents. */
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

const contentTypes = Object.keys(DOCUMENT_TYPES) as [DocumentContentType, ...DocumentContentType[]];

export const uploadRequestSchema = z.object({
  kind: z.enum(SELLER_DOCUMENT_KINDS),
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(contentTypes, { error: "Upload a PDF, JPG or PNG file." }),
  sizeBytes: z.number().int().min(1, "This file is empty.").max(DOCUMENT_MAX_BYTES, "Files must be 5 MB or smaller."),
});

const text = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `Enter ${label}.`)
    .max(max, `Keep ${label} to ${max} characters or fewer.`)
    .regex(/^[^\p{Cc}]*$/u, `Remove line breaks and special characters from ${label}.`);

export const sellerApplicationSchema = z.object({
  companyName: text(2, 120, "your company name"),
  contactName: text(2, 100, "the contact person's name"),
  contactPhone: phoneSchema,
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter a contact email.")
    .max(254)
    .pipe(z.email("Enter a valid email address, like name@company.com.")),
  address: z.string().trim().min(5, "Enter your business address.").max(300, "Keep the address to 300 characters or fewer."),
  city: text(2, 80, "your city"),
  state: z.enum(INDIAN_STATES, { error: "Choose a state." }),
  description: z.string().trim().max(1000, "Keep the description to 1000 characters or fewer.").optional(),
});

export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>;
