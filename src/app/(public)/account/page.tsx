import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isComingSoon } from "@/lib/coming-soon";
import { BUSINESS_CATEGORIES, leadIndustryName } from "@/lib/lead-schema";
import { LEAD_DECISION_LABELS } from "@/lib/lead-status";
import { SELLER_STATUS_LABELS } from "@/lib/seller-status";
import { formatDay, leadSubscription } from "@/lib/subscription";
import { requireMember } from "@/server/authz";
import { db } from "@/server/db";
import { memberSignOutAction } from "./actions";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountPage() {
  const member = await requireMember("/account");
  const [seller, lead] = await Promise.all([
    db().seller.findUnique({ where: { userId: member.id }, select: { companyName: true, status: true } }),
    // The Seller registration the team made this login from (none for older, self-made accounts).
    db().lead.findUnique({
      where: { userId: member.id },
      select: {
        decision: true,
        payment: true,
        createdAt: true,
        tenureMonths: true,
        subscriptionFrom: true,
        subscriptionUntil: true,
        businessCategory: true,
        industryOther: true,
        industries: { select: { name: true } },
      },
    }),
  ]);
  // Before launch the buying and selling pages are closed, so only the registration is shown.
  const closed = isComingSoon();
  const subscription = lead ? leadSubscription(lead) : null;
  // The subscription counts once the team has checked the payment screenshot.
  const subscriptionLine = !lead || !subscription
    ? "None"
    : lead.payment === "APPROVED"
      ? `${subscription.months ? `${subscription.months} months, ` : ""}${formatDay(subscription.from)} to ${formatDay(subscription.until)}`
      : lead.payment === "REJECTED"
        ? "None: we could not confirm your payment. Please contact the Harsol27 team."
        : "Starts once our team has checked your payment.";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Your account</h1>
        <p className="text-muted-foreground">Signed in as {member.email ?? member.phone}</p>
        <p className="text-muted-foreground">
          Mobile number for sellers: {member.phone} ·{" "}
          <Link href={`/account/mobile?change=1&next=${encodeURIComponent("/account")}`} className="font-medium text-primary underline">
            Change
          </Link>
        </p>
      </div>

      {lead && (
        <section aria-labelledby="registration-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <h2 id="registration-heading" className="text-lg font-semibold">
            Your seller registration
          </h2>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <Badge variant="secondary">{LEAD_DECISION_LABELS[lead.decision]}</Badge>
            </dd>
            <dt className="text-muted-foreground">Subscription</dt>
            <dd>{subscriptionLine}</dd>
            <dt className="text-muted-foreground">Category</dt>
            <dd>{BUSINESS_CATEGORIES.find((c) => c.value === lead.businessCategory)?.label}</dd>
            <dt className="text-muted-foreground">Industry</dt>
            <dd>{leadIndustryName(lead)}</dd>
          </dl>
          {closed && <p className="text-sm text-muted-foreground">Harsol27 opens soon. You will be able to list your products here then.</p>}
        </section>
      )}

      {!closed && (
        <>
          <section aria-labelledby="buying-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <h2 id="buying-heading" className="text-lg font-semibold">
              Buying
            </h2>
            <p className="text-muted-foreground">Sellers you have contacted, with their phone numbers and emails.</p>
            <Button asChild variant="outline" className="w-fit">
              <Link href="/account/inquiries">My inquiries</Link>
            </Button>
          </section>

          <section aria-labelledby="seller-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <h2 id="seller-heading" className="text-lg font-semibold">
              Selling on Harsol27
            </h2>
            {seller ? (
              <>
                <p className="flex flex-wrap items-center gap-2">
                  {seller.companyName} <Badge variant="secondary">{SELLER_STATUS_LABELS[seller.status]}</Badge>
                </p>
                <Button asChild variant="outline" className="w-fit">
                  <Link href="/seller">Open your seller page</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Apply to list your products. Our team reviews every application before a seller is listed.
                </p>
                <Button asChild className="w-fit">
                  <Link href="/seller/apply">Apply to become a seller</Link>
                </Button>
              </>
            )}
          </section>

        </>
      )}

      <form action={memberSignOutAction}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
