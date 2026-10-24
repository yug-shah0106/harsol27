import type { Messages } from "@/i18n/en";

/**
 * The public site's languages (client, 2026-10-24): English, Hindi and Gujarati. The visitor's choice is kept in a
 * cookie (no /hi/ or /gu/ in the address), the server renders each page in it, and the admin stays in English.
 * The texts live in src/i18n/ (en.ts defines every key; hi.ts and gu.ts must supply each one). Server components read
 * them with getMessages() (server/locale.ts); client components get the visitor's language only, with useI18n().
 */
export const LOCALES = ["en", "hi", "gu"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Each language in its own script, as the button and the popup show it. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", hi: "हिन्दी", gu: "ગુજરાતી" };

/** The first-visit popup asks in all three (the visitor may read only one of them). */
export const LANGUAGE_PROMPT: Record<Locale, { choose: string; hint: string }> = {
  en: { choose: "Choose your language", hint: "You can change it any time with the language button at the top of the page." },
  hi: { choose: "अपनी भाषा चुनें", hint: "आप इसे कभी भी पेज के ऊपर दिए भाषा बटन से बदल सकते हैं।" },
  gu: { choose: "તમારી ભાષા પસંદ કરો", hint: "તમે પેજની ઉપરના ભાષા બટનથી ગમે ત્યારે તેને બદલી શકો છો." },
};

/** For `lang` attributes and dates. */
export const HTML_LANG: Record<Locale, string> = { en: "en-IN", hi: "hi-IN", gu: "gu-IN" };

export const isLocale = (value: unknown): value is Locale => (LOCALES as readonly unknown[]).includes(value);

/** "24 November 2026" in the visitor's language (`day` is "YYYY-MM-DD" or a date at midnight UTC). */
export function formatLongDate(day: string | Date, locale: Locale): string {
  const date = typeof day === "string" ? new Date(`${day}T00:00:00.000Z`) : day;
  return new Intl.DateTimeFormat(HTML_LANG[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

/** "7 Oct 2027" in the visitor's language. */
export function formatShortDate(day: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(HTML_LANG[locale], { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(day);
}

/** Fills `{name}` placeholders: fill("Step {n}: ", { n: 2 }) → "Step 2: ". */
export const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));

/** A message from the form rules or the server (always written in English) in the visitor's language; unknown ones stay English. */
export function translateError(t: Messages, message: string): string {
  if (t.errors[message]) return t.errors[message];
  for (const [pattern, text] of Object.entries(t.errorPatterns)) {
    const rule = new RegExp(`^${pattern}$`);
    if (rule.test(message)) return message.replace(rule, text);
  }
  return message;
}

/** An industry as stored (English) in the visitor's language. */
export const industryName = (t: Messages, name: string) => t.industries[name.toLowerCase()] ?? name;
