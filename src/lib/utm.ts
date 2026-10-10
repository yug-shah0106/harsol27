// Campaign tags (utm_source=newsletter&utm_campaign=diwali…) from the link a visitor arrived by, so
// staff can see which campaign brought each Get started enquiry. Nothing personal: just the tags.

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
export type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

/** Where the tags wait (this browser tab only) between the landing page and the form. */
export const UTM_STORAGE_KEY = "harsol27.utm";

/** The known tags, trimmed and cut to 100 characters; null when there are none. Anything else is ignored. */
export function pickUtm(get: (key: string) => unknown): Utm | null {
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const value = get(key);
    if (typeof value === "string" && value.trim()) utm[key] = value.trim().slice(0, 100);
  }
  return Object.keys(utm).length ? utm : null;
}

/** The tags as the form sends them (a JSON string, or nothing); anything malformed counts as none. */
export function parseUtm(raw: unknown): Utm | null {
  if (typeof raw !== "string" || !raw || raw.length > 2000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" ? pickUtm((key) => (value as Record<string, unknown>)[key]) : null;
  } catch {
    return null;
  }
}
