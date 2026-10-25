"use client";

import { createContext, useContext } from "react";
import type { Messages } from "@/i18n/en";
import type { Locale } from "@/lib/i18n";

const I18nContext = createContext<{ locale: Locale; t: Messages } | null>(null);

/**
 * The texts for client components, from the server: on public pages the visitor's language
 * (components/locale-root.tsx), only that one reaching the browser; in the admin and staff pages, English.
 */
export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  return <I18nContext value={{ locale, t: messages }}>{children}</I18nContext>;
}

export function useI18n() {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error("useI18n() needs an <I18nProvider> above it (a layout).");
  return i18n;
}
