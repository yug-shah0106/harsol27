import type { Accent } from "@/i18n/en";
import { formatLongDate } from "@/lib/i18n";
import { getLocale, getMessages } from "@/server/locale";

/** Simple long-form text page: readable line length and consistent heading/paragraph spacing. */

/** `updated`: when the text last changed, as YYYY-MM-DD (shown as "Last updated 10 October 2026"). */
export async function ProsePage({ title, accent, lead, updated, children }: { title: string; accent?: Accent; lead?: string; updated?: string; children: React.ReactNode }) {
  const [locale, t] = [await getLocale(), await getMessages()];
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {accent && (
        <p lang={accent.lang} className="mb-3 w-fit rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-primary">
          {accent.text}
        </p>
      )}
      <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-primary sm:text-6xl">{title}</h1>
      {updated && (
        <p className="mt-3 text-sm text-muted-foreground">
          {t.prose.lastUpdated} <time dateTime={updated}>{formatLongDate(updated, locale)}</time>
        </p>
      )}
      {lead && <p className="mt-4 text-lg text-muted-foreground">{lead}</p>}
      <div className="mt-8 flex flex-col gap-4 leading-relaxed [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </div>
    </article>
  );
}

/** Shown on legal pages until the client's legal review is done. */
export async function DraftNotice() {
  const t = await getMessages();
  return (
    <p className="rounded-lg border border-border bg-secondary p-3 text-sm">
      <strong>{t.prose.draftTitle}</strong> {t.prose.draft}
    </p>
  );
}
