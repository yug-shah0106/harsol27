/** Simple long-form text page: readable line length and consistent heading/paragraph spacing. */
const longDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** `updated`: when the text last changed, as YYYY-MM-DD (shown as "Last updated 10 October 2026"). */
export function ProsePage({ title, lead, updated, children }: { title: string; lead?: string; updated?: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-primary sm:text-6xl">{title}</h1>
      {updated && (
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated <time dateTime={updated}>{longDate.format(new Date(updated))}</time>
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
export function DraftNotice() {
  return (
    <p className="rounded-lg border border-border bg-secondary p-3 text-sm">
      <strong>Draft.</strong> This page is being finalised and may change before launch.
    </p>
  );
}
