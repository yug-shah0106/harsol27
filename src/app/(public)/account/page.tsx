import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isComingSoon } from "@/lib/coming-soon";
import { fill, formatShortDate, industryName } from "@/lib/i18n";
import { SELLER_STATUS_LABELS } from "@/lib/seller-status";
import { leadSubscription } from "@/lib/subscription";
import { requireMember } from "@/server/authz";
import { db } from "@/server/db";
import { getLocale, getMessages } from "@/server/locale";
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
  const [locale, t] = [await getLocale(), await getMessages()];
  const a = t.account;
  const subscription = lead ? leadSubscription(lead) : null;
  const range = subscription && { months: subscription.months ?? "", from: formatShortDate(subscription.from, locale), until: formatShortDate(subscription.until, locale) };
  // The subscription counts once the team has checked the payment screenshot.
  const subscriptionLine = !lead || !range
    ? t.common.none
    : lead.payment === "APPROVED"
      ? fill(range.months ? a.monthsRange : a.range, range)
      : lead.payment === "REJECTED"
        ? a.paymentRejected
        : a.paymentPending;
  const industries = lead && [...lead.industries.map((i) => industryName(t, i.name)), ...(lead.industryOther ? [lead.industryOther] : [])].join(", ");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">{a.title}</h1>
        <p className="text-muted-foreground">{fill(a.signedInAs, { who: member.email ?? member.phone ?? "" })}</p>
        <p className="text-muted-foreground">
          {fill(a.mobile, { phone: member.phone ?? "" })} ·{" "}
          <Link href={`/account/mobile?change=1&next=${encodeURIComponent("/account")}`} className="font-medium text-primary underline">
            {a.change}
          </Link>
        </p>
      </div>

      {lead && (
        <section aria-labelledby="registration-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <h2 id="registration-heading" className="text-lg font-semibold">
            {a.registration}
          </h2>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
            <dt className="text-muted-foreground">{a.status}</dt>
            <dd>
              <Badge variant="secondary">{t.decisions[lead.decision]}</Badge>
            </dd>
            <dt className="text-muted-foreground">{a.subscription}</dt>
            <dd>{subscriptionLine}</dd>
            <dt className="text-muted-foreground">{a.category}</dt>
            <dd>{t.categories[lead.businessCategory]}</dd>
            <dt className="text-muted-foreground">{a.industry}</dt>
            <dd>{industries || t.common.none}</dd>
          </dl>
          {closed && <p className="text-sm text-muted-foreground">{a.opensSoon}</p>}
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
          {a.signOut}
        </Button>
      </form>
    </div>
  );
}
