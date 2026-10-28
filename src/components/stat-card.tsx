import Link from "next/link";
import { cn } from "cn";
import { CountUp } from "@/components/motion-text";

/** A number on a card, linking to where it comes from (the admin and seller dashboards). */
export function StatCard({ href, label, value, note, dot, highlight, small }: { href: string; label: string; value: number; note?: string; dot?: string; highlight?: boolean; small?: boolean }) {
  return (
    <li>
      <Link href={href} className={cn("flex h-full flex-col gap-1 rounded-2xl border border-border bg-card no-underline transition-colors hover:border-primary", small ? "p-4" : "p-5", highlight && "bg-primary text-primary-foreground hover:border-accent")}>
        <span className={cn("flex items-center gap-2 text-sm", highlight ? "text-primary-foreground/85" : "text-muted-foreground")}>
          {dot && <span aria-hidden="true" className={cn("size-2.5 rounded-full", dot)} />}
          {label}
        </span>
        <CountUp value={value} className={cn("font-bold", small ? "text-2xl" : "text-4xl")} />
        {note && <span className={cn("text-xs", highlight ? "text-primary-foreground/85" : "text-muted-foreground")}>{note}</span>}
      </Link>
    </li>
  );
}
