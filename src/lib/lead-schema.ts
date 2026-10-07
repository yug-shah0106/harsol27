import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import { z } from "zod";

// Shared by the lead form (instant feedback in the browser) and the server (the source of truth).

export const BUSINESS_CATEGORIES = [
  { value: "MANUFACTURING", label: "Manufacturing" },
  { value: "WHOLESALE", label: "Wholesale" },
  { value: "RETAIL", label: "Retail" },
  { value: "SERVICES", label: "Services" },
  { value: "TRADING", label: "Trading" },
  { value: "OTHERS", label: "Others" },
] as const;

export type BusinessCategoryValue = (typeof BUSINESS_CATEGORIES)[number]["value"];

const categoryValues = BUSINESS_CATEGORIES.map((c) => c.value) as [BusinessCategoryValue, ...BusinessCategoryValue[]];

/** Name of the hidden honeypot field. Real people never see or fill it. */
export const HONEYPOT_FIELD = "company_website";

/**
 * Phone in any common format ("98765 43210", "+91 98765-43210", "+44 20 …"). India is assumed when no
 * country code is given. Normalised to E.164. The browser uses compact metadata (length checks);
 * the server re-checks with full metadata (see server/leads.ts).
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Enter your phone number.")
  .max(32, "That phone number is too long.")
  .transform((value, ctx) => {
    const phone = parsePhoneNumberFromString(value, "IN");
    if (!phone?.isValid()) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number, for example 98765 43210." });
      return z.NEVER;
    }
    return phone.number;
  });

export const leadSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(100, "Please shorten your name to 100 characters.")
    .regex(/^[^\p{Cc}]*$/u, "Your name can only contain letters, spaces and punctuation."),
  phone: phoneSchema,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter your email address.")
    .max(254, "That email address is too long.")
    .pipe(z.email("Enter a valid email address, like name@company.com.")),
  businessCategory: z.enum(categoryValues, { error: "Choose a business category." }),
  industryId: z.uuid({ error: "Choose an industry." }),
});

export type LeadInput = z.infer<typeof leadSchema>;

/** Flattens zod issues into { field: first message }, the shape the form shows under each field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
