import { I18nProvider } from "@/components/i18n";
import { LanguagePrompt } from "@/components/language";
import { MESSAGES } from "@/i18n";
import { HTML_LANG } from "@/lib/i18n";
import { getLocale, hasChosenLocale } from "@/server/locale";

/** Wraps the public pages: their language (for screen readers and fonts), the texts for client components, and the first-visit popup. */
export async function LocaleRoot({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <div lang={HTML_LANG[locale]} className="contents">
      <I18nProvider locale={locale} messages={MESSAGES[locale]}>
        {children}
        {!(await hasChosenLocale()) && <LanguagePrompt />}
      </I18nProvider>
    </div>
  );
}
