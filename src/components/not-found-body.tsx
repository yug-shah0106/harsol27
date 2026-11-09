import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/server/locale";

/** The 404 message, without a header or footer: the page around it (app/not-found.tsx or the public layout) has those. */
export async function NotFoundBody() {
  const t = await getMessages();
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
      <p className="text-sm font-semibold text-muted-foreground">{t.notFound.kicker}</p>
      <h1 className="text-3xl font-extrabold tracking-tight">{t.notFound.title}</h1>
      <p className="text-muted-foreground">{t.notFound.body}</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/search">{t.notFound.search}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{t.notFound.home}</Link>
        </Button>
      </div>
    </div>
  );
}
