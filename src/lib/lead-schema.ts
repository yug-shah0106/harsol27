import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import { z } from "zod";
import { INDIAN_STATES } from "./indian-states";

// Shared by the lead form (instant feedback in the browser) and the server (the source of truth).

export const BUSINESS_CATEGORIES = [
  { value: "MANUFACTURING", label: "Manufacturers" },
  { value: "WHOLESALE", label: "Wholesale" },
  { value: "RETAIL", label: "Retail" },
  { value: "SERVICES", label: "Services" },
  { value: "TRADING", label: "Trading" },
  { value: "OTHERS", label: "Others" },
] as const;

export type BusinessCategoryValue = (typeof BUSINESS_CATEGORIES)[number]["value"];

const categoryValues = BUSINESS_CATEGORIES.map((c) => c.value) as [BusinessCategoryValue, ...BusinessCategoryValue[]];


/**
 * Phone in any common format ("98765 43210", "+91 98765-43210", "+44 20 …"). India is assumed when no
 * country code is given. Normalised to E.164. The browser uses compact metadata (length checks);
 * the server re-checks with full metadata (see server/leads.ts).
 */
const phoneNumber = (what: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${what}.`)
    .max(32, `That ${what} is too long.`)
    .transform((value, ctx) => {
      const phone = parsePhoneNumberFromString(value, "IN");
      if (!phone?.isValid()) {
        ctx.addIssue({ code: "custom", message: `Enter a valid ${what}, for example 98765 43210.` });
        return z.NEVER;
      }
      return phone.number;
    });
export const phoneSchema = phoneNumber("phone number");

/** A required one-line text field: trimmed, 2 characters or more, no control characters (no header injection in emails). */
const line = (missing: string, max: number) =>
  z
    .string({ error: missing })
    .trim()
    .min(2, missing)
    .max(max, `Please shorten it to ${max} characters.`)
    .regex(/^[^\p{Cc}]*$/u, "Use letters, numbers and punctuation only.");

/** A person's whole name in one field (member sign-up; the lead form asks for its parts). */
export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(100, "Please shorten your name to 100 characters.")
  .regex(/^[^\p{Cc}]*$/u, "Your name can only contain letters, spaces and punctuation.");

/** The industry dropdown's "Other (not listed)": the visitor then types their industry. */
export const OTHER_INDUSTRY = "other";

/** A lead's industry as staff see it: the listed one, or "Other: <what they typed>". */
export function leadIndustryName(lead: { industries: { name: string }[]; industryOther: string | null }): string {
  const names = lead.industries.map((i) => i.name);
  if (lead.industryOther) names.push(`Other: ${lead.industryOther}`);
  return names.join(", ") || "Not given";
}

/** The native places the community comes from, as the client listed them. "Other" lets the visitor type theirs. */
export const NATIVE_PLACES = [
  "Adpodara",
  "Aagiyol",
  "Aakodara",
  "Aantroli",
  "Berna",
  "Dhundhar",
  "Hadiyol",
  "Himmatnagar",
  "Harsol",
  "Hathrol",
  "Modhuka",
  "Mohanpur",
  "Mota Chekhla",
  "Nana Chekhla",
  "Ranasan",
  "Rupal",
  "Shinol",
  "Dakshin",
] as const;
export const OTHER_NATIVE_PLACE = "Other";

/** An optional web address: "https://" is added when left off, and only http(s) addresses with a real host pass. */
const optionalLink = (example: string) =>
  z
    .string()
    .trim()
    .max(300, "That link is too long.")
    .optional()
    .default("")
    .transform((value, ctx) => {
      if (!value) return "";
      try {
        const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
        if (/^https?:$/.test(url.protocol) && url.hostname.includes(".")) return url.toString();
      } catch {
        // falls through to the message
      }
      ctx.addIssue({ code: "custom", message: `Enter a web address, like ${example}.` });
      return z.NEVER;
    });

export const leadSchema = z
  .object({
  firstName: line("Enter your first name.", 50),
  fatherName: line("Enter your father's name.", 50),
  lastName: line("Enter your last name.", 50),
  nativePlace: z.enum([...NATIVE_PLACES, OTHER_NATIVE_PLACE], { error: "Choose your native place." }),
  nativePlaceOther: z
    .string()
    .trim()
    .max(100, "Please shorten it to 100 characters.")
    .regex(/^[^\p{Cc}]*$/u, "Use letters, numbers and punctuation only.")
    .optional()
    .default(""),
  address: line("Enter your address.", 300),
  city: line("Enter your city.", 80),
  state: z.enum(INDIAN_STATES, { error: "Choose your state." }),
  // Six digits, not starting with 0 ("380 001" is fine too).
  pincode: z
    .string({ error: "Enter your pincode." })
    .transform((value) => value.replace(/\s/g, ""))
    .pipe(z.string().min(1, "Enter your pincode.").regex(/^[1-9]\d{5}$/, "Enter a 6-digit pincode, like 380001.")),
  phone: phoneNumber("WhatsApp number"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter your email address.")
    .max(254, "That email address is too long.")
    .pipe(z.email("Enter a valid email address, like name@company.com.")),
  businessCategory: z.enum(categoryValues, { error: "Choose a category." }),
  // One industry per registration (since 2026-10-19). Still a list, as a lead's industries are in the
  // database: older leads named up to five.
  industryIds: z
    .array(z.union([z.uuid({ error: "Choose an industry." }), z.literal(OTHER_INDUSTRY, { error: "Choose an industry." })]), { error: "Choose an industry." })
    .min(1, "Choose an industry.")
    .transform((ids) => [...new Set(ids)])
    .pipe(z.array(z.string()).max(1, "Choose one industry.")),
  industryOther: z
    .string()
    .trim()
    .max(80, "Please shorten it to 80 characters.")
    .regex(/^[^\p{Cc}]*$/u, "Use letters, numbers and punctuation only.")
    .optional()
    .default(""),
  website: optionalLink("www.yourshop.com"),
  mapsLink: optionalLink("https://maps.app.goo.gl/…"),
  // "@yourshop", "yourshop" or an instagram.com link → "yourshop".
  instagram: z
    .string()
    .trim()
    .max(200, "That is too long for an Instagram name.")
    .optional()
    .default("")
    .transform((value, ctx) => {
      if (!value) return "";
      const handle = value.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "").replace(/^@/, "").split(/[/?#]/)[0] ?? "";
      if (/^[A-Za-z0-9._]{1,30}$/.test(handle)) return handle;
      ctx.addIssue({ code: "custom", message: "Enter your Instagram name, like @yourshop." });
      return z.NEVER;
    }),
  // The storage key of the uploaded payment screenshot (the browser uploads it first; see leads.ts).
  paymentProof: z.string({ error: "Add a screenshot of your payment." }).trim().min(1, "Add a screenshot of your payment.").max(200),
  })
  .superRefine((lead, ctx) => {
    if (lead.industryIds.includes(OTHER_INDUSTRY) && lead.industryOther.length < 2) {
      ctx.addIssue({ code: "custom", path: ["industryOther"], message: "Tell us your industry." });
    }
    if (lead.nativePlace === OTHER_NATIVE_PLACE && lead.nativePlaceOther.length < 2) {
      ctx.addIssue({ code: "custom", path: ["nativePlaceOther"], message: "Enter your native place (village or town)." });
    }
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

/** A member login's username: 3 to 30 lowercase letters, numbers, dots or underscores, starting with a letter or number. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._]{2,29}$/, "Use 3 to 30 letters, numbers, dots or underscores, starting with a letter or number.");

/** A first suggestion for a registration's username: first and last name together, letters and numbers only ("yugshah"). */
export function suggestUsername(lead: { firstName: string | null; lastName: string | null; fullName: string }): string {
  const name = lead.firstName && lead.lastName ? `${lead.firstName}${lead.lastName}` : lead.fullName;
  const plain = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
  return plain.length >= 3 ? plain : `${plain}seller`.slice(0, 30);
}
