import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fill, formatShortDate, industryName } from "@/lib/i18n";
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
        </section>
      )}

      <section aria-labelledby="buying-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <h2 id="buying-heading" className="text-lg font-semibold">
          {t.buyer.buying}
        </h2>
        <p className="text-muted-foreground">{t.buyer.buyingText}</p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/account/inquiries">{t.buyer.myInquiries}</Link>
        </Button>
      </section>

      <section aria-labelledby="seller-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <h2 id="seller-heading" className="text-lg font-semibold">
          {t.buyer.selling}
        </h2>
        {/* Two steps (client, 2026-10-24): the team approves the Seller registration, then the seller page. */}
        {seller ? (
          <>
            <p className="flex flex-wrap items-center gap-2">
              {seller.companyName} <Badge variant="secondary">{t.sellerStatuses[seller.status]}</Badge>
            </p>
            <Button asChild variant="outline" className="w-fit">
              <Link href="/seller/dashboard">{t.buyer.openSeller}</Link>
            </Button>
          </>
        ) : lead?.decision === "APPROVED" ? (
          <>
            <p className="text-muted-foreground">{t.buyer.setUp}</p>
            <Button asChild className="w-fit">
              <Link href="/seller/companyverification">{t.buyer.setUpButton}</Link>
            </Button>
          </>
        ) : lead ? (
          <p className="text-muted-foreground">{t.buyer.registered}</p>
        ) : (
          <>
            <p className="text-muted-foreground">{t.buyer.register}</p>
            <Button asChild className="w-fit">
              <Link href="/Seller-Registration">{t.buyer.registerButton}</Link>
            </Button>
          </>
        )}
      </section>


      <form action={memberSignOutAction}>
        <Button type="submit" variant="outline">
          {a.signOut}
        </Button>
      </form>
    </div>
  );
}
