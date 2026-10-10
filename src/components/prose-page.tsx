/** Simple long-form text page: readable line length and consistent heading/paragraph spacing. */
export function ProsePage({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-primary sm:text-6xl">{title}</h1>
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
