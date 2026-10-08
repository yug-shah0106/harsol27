import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { formatDay, type SubscriptionState } from "@/lib/subscription";

const TONES = {
  ok: { Icon: CircleCheck, className: "border-success" },
  warn: { Icon: TriangleAlert, className: "border-accent border-2" },
  bad: { Icon: CircleAlert, className: "border-destructive" },
} as const;

/** The seller's subscription in a sentence or two. Icon + words carry the meaning, the border colour only adds to it. */
export function SubscriptionStatus({ state, paidUntil }: { state: SubscriptionState; paidUntil: Date | null }) {
  const until = paidUntil ? formatDay(paidUntil) : "";
  let tone: keyof typeof TONES;
  let message: React.ReactNode;
  if (state.kind === "none") {
    tone = "bad";
    message = (
      <>
        <strong>Not active yet.</strong> Your products are not visible to buyers until the Harsol27 team records your yearly subscription.
      </>
    );
  } else if (state.kind === "expired") {
    tone = "bad";
    message = (
      <>
        <strong>Expired.</strong> Your subscription was paid until {until}, so your products are hidden from buyers. Your account, products and
        inquiries are kept, and your listings come back as soon as your renewal is recorded.
      </>
    );
  } else {
    tone = state.kind === "expiring" ? "warn" : "ok";
    const left = state.daysLeft === 0 ? "today is the last day" : `${state.daysLeft} ${state.daysLeft === 1 ? "day" : "days"} left`;
    message = (
      <>
        Active until <strong>{until}</strong> ({left}). Your listed products are visible to buyers.
        {state.kind === "expiring" && " Please renew soon so they stay visible."}
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
