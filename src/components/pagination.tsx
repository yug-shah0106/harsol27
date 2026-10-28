import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/i18n";
import { getMessages } from "@/server/locale";

/** Previous / next links that keep every other query parameter. */
export async function Pagination({ basePath, params, page, pageCount }: { basePath: string; params: Record<string, string | number | undefined>; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const { browse: b } = await getMessages();
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined && String(value) !== "") qs.set(key, String(value));
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <nav aria-label={b.pagination} className="flex items-center justify-between gap-4">
      {page > 1 ? (
        <Button asChild variant="outline">
          <Link href={href(page - 1)}>{b.previous}</Link>
        </Button>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground">
        {fill(b.pageOf, { page, count: pageCount })}
      </span>
      {page < pageCount ? (
        <Button asChild variant="outline">
          <Link href={href(page + 1)}>{b.next}</Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
