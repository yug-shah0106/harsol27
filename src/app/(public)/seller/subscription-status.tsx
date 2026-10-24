import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { fill, formatShortDate } from "@/lib/i18n";
import type { SubscriptionState } from "@/lib/subscription";
import { getLocale, getMessages } from "@/server/locale";

const TONES = {
  ok: { Icon: CircleCheck, className: "border-success" },
  warn: { Icon: TriangleAlert, className: "border-accent border-2" },
  bad: { Icon: CircleAlert, className: "border-destructive" },
} as const;

/** The seller's subscription in a sentence or two. Icon + words carry the meaning, the border colour only adds to it. */
export async function SubscriptionStatus({ state, paidUntil }: { state: SubscriptionState; paidUntil: Date | null }) {
  const [locale, { sellerArea: s }] = [await getLocale(), await getMessages()];
  const until = paidUntil ? formatShortDate(paidUntil, locale) : "";
  let tone: keyof typeof TONES;
  let message: React.ReactNode;
  if (state.kind === "none") {
    tone = "bad";
    message = (
      <>
        <strong>{s.notActive}</strong>
        {s.notActiveBody}
      </>
    );
  } else if (state.kind === "expired") {
    tone = "bad";
    message = (
      <>
        <strong>{s.expired}</strong>
        {fill(s.expiredBody, { until })}
      </>
    );
  } else {
    tone = state.kind === "expiring" ? "warn" : "ok";
    const left = state.daysLeft === 0 ? s.lastDay : state.daysLeft === 1 ? s.dayLeft : fill(s.daysLeft, { n: state.daysLeft });
    message = (
      <>
        {s.activeBefore}
        <strong>{until}</strong>
        {fill(s.activeAfter, { left })}
        {state.kind === "expiring" && s.renewSoon}
      </>
    );
  }
  const { Icon, className } = TONES[tone];
  return (
    <div role="status" className={`flex items-start gap-2 rounded-lg border bg-card p-3 ${className}`}>
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
