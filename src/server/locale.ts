import { cookies } from "next/headers";
import { MESSAGES } from "@/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/preferences";

/** The visitor's language from their cookie (English until they choose). */
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(chosen) ? chosen : DEFAULT_LOCALE;
}

/** Whether the visitor has chosen a language yet (the first-visit popup asks until they do). */
export async function hasChosenLocale(): Promise<boolean> {
  return isLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function getMessages() {
  return MESSAGES[await getLocale()];
}
