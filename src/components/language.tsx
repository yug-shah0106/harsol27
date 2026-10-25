"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useI18n } from "@/components/i18n";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { HTML_LANG, isLocale, LANGUAGE_PROMPT, LOCALE_NAMES, LOCALES, type Locale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/preferences";

const OPTIONS = LOCALES.map((locale) => ({ value: locale, label: LOCALE_NAMES[locale] }));

/** Remembered for a year (like dark mode); the server renders the page again in it. */
function useChooseLocale() {
  const router = useRouter();
  const { locale: current } = useI18n();
  return (locale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    if (locale !== current) router.refresh();
  };
}

/** The header's language button (and the phone menu's): English, हिन्दी, ગુજરાતી. */
export function LanguageSwitcher({ id }: { id: string }) {
  const { locale, t } = useI18n();
  const choose = useChooseLocale();
  return (
    <div className="flex items-center">
      <label htmlFor={id} className="flex text-muted-foreground">
        <Languages aria-hidden="true" className="size-4" />
        <span className="sr-only">{t.language.label}</span>
      </label>
      <Dropdown
        id={id}
        options={OPTIONS}
        value={locale}
        onValueChange={(value) => isLocale(value) && choose(value)}
        triggerClassName="h-10 w-auto border-0 bg-transparent pr-8 pl-1.5 text-sm font-medium md:text-sm"
      />
    </div>
  );
}

/**
 * First visit: asks for the preferred language, in all three (the visitor may read only one). Closing it
 * (Escape) keeps English; either way it is not asked again.
 */
export function LanguagePrompt() {
  const dialog = useRef<HTMLDialogElement>(null);
  const choose = useChooseLocale();
  useEffect(() => dialog.current?.showModal(), []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="language-prompt-title"
      onClose={() => choose(isLocale(dialog.current?.returnValue) ? dialog.current.returnValue : "en")}
      className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xl backdrop:bg-foreground/40 open:animate-in open:fade-in open:zoom-in-95"
    >
      <h2 id="language-prompt-title" className="flex flex-col gap-1 text-lg font-semibold">
        {LOCALES.map((locale) => (
          <span key={locale} lang={HTML_LANG[locale]}>
            {LANGUAGE_PROMPT[locale].choose}
          </span>
        ))}
      </h2>
      <form method="dialog" className="mt-5 flex flex-col gap-2">
        {LOCALES.map((locale) => (
          <Button key={locale} type="submit" name="locale" value={locale} variant="outline" size="lg" lang={HTML_LANG[locale]} className="h-12 rounded-full text-base">
            {LOCALE_NAMES[locale]}
          </Button>
        ))}
      </form>
      <ul className="mt-4 flex flex-col gap-1 text-sm text-muted-foreground">
        {LOCALES.map((locale) => (
          <li key={locale} lang={HTML_LANG[locale]}>
            {LANGUAGE_PROMPT[locale].hint}
          </li>
        ))}
      </ul>
    </dialog>
  );
}
