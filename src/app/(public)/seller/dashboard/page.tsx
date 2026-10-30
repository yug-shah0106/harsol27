import { ArrowRight, CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";
import { Rangoli } from "@/components/festive";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fill, HTML_LANG } from "@/lib/i18n";
import { mayEditApplication, mayListProducts } from "@/lib/seller-status";
import { subscriptionState } from "@/lib/subscription";
import { requireMember, SELLER_HOME_PATH } from "@/server/authz";
import { getSellerContact } from "@/server/contact-access";
import { db } from "@/server/db";
import { countRecentInquiries } from "@/server/inquiries";
import { getLocale, getMessages } from "@/server/locale";
import { listMyProducts } from "@/server/products";
import { getMySeller } from "@/server/sellers";
import { indiaToday } from "@/server/visibility";
import { isLive, MyProductList, SuspendedListing } from "../products/product-list";
import { SellerNav } from "../seller-nav";
import { SubscriptionStatus } from "../subscription-status";
import { ProfileForm } from "./profile-form";
import { SendForApproval } from "./send-for-approval";

export const metadata: Metadata = { title: "Seller dashboard", robots: { index: false } };

const IST = "Asia/Kolkata";
const SHOWN_PRODUCTS = 5;

// Where a seller lands after signing in (2026-10-27), laid out like the admin overview: a greeting with the next
// step, their numbers (or their three steps until approved), the product listing and their profile.
export default async function SellerDashboardPage() {
  const member = await requireMember(SELLER_HOME_PATH);
  const [seller, user] = await Promise.all([
    getMySeller(member.id),
    db().user.findUniqueOrThrow({ where: { id: member.id }, select: { name: true, username: true, lead: { select: { decision: true } } } }),
  ]);
  const approved = seller?.status === "APPROVED";
  // The seller fills in both, in either order, then sends them together for one approval (seller-status.ts).
  const listing = !seller || mayListProducts(seller.status);
  const editable = !seller || mayEditApplication(seller.status);
  const detailsSaved = !!seller?.detailsSavedAt;
  const [contact, products, inquiriesThisWeek, inquiriesAll] = await Promise.all([
    seller && getSellerContact({ kind: "member", id: member.id }, seller.id),
    seller ? listMyProducts(seller.id) : [],
    approved ? countRecentInquiries(7, seller.id) : 0,
    approved ? db().inquiry.count({ where: { sellerId: seller.id } }) : 0,
  ]);
  const [locale, t] = [await getLocale(), await getMessages()];
  const s = t.sellerArea;
  const reason = (seller?.status === "REJECTED" || seller?.status === "SUSPENDED") && seller.statusChanges[0]?.reason;
  const subscriptionActive = !!seller?.paidUntil && seller.paidUntil >= indiaToday();

  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: IST }).format(now));
  const greeting = hour < 12 ? s.goodMorning : hour < 17 ? s.goodAfternoon : s.goodEvening;
  const today = new Intl.DateTimeFormat(HTML_LANG[locale], { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: IST }).format(now);
  const ready = !!seller && editable && detailsSaved && products.length > 0;
  const rejected = seller?.status === "REJECTED";
  // The one thing to do next; once both are filled in, that is the "Send for approval" button instead.
  const next = !listing
    ? null
    : editable && !detailsSaved
      ? { href: "/seller/companyverification", label: s.startButton }
      : ready
        ? rejected
          ? { href: "/seller/companyverification", label: s.applyAgain }
          : null
        : { href: "/seller/products/new", label: s.addProduct };

  // Steps 2 and 3 are sent, and approved, together.
  const steps = [
    { title: s.stepRegistration, status: user.lead ? t.decisions[user.lead.decision] : s.notRegistered, done: user.lead?.decision === "APPROVED", href: user.lead ? "/account" : "/Seller-Registration" },
    { title: s.verification, status: editable && !rejected ? (detailsSaved ? s.detailsSaved : s.notSent) : t.sellerStatuses[seller!.status], done: detailsSaved && !rejected, href: "/seller/companyverification" },
    { title: s.products, status: products.length ? fill(products.length === 1 ? s.productAdded : s.productsAdded, { n: products.length }) : s.addYourProducts, done: products.length > 0 && !rejected, href: "/seller/products" },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <SellerNav approved={approved} />

      {/* Greeting: who, when, where things stand, and the one thing to do next. */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-linear-to-br from-accent/40 via-card to-card p-6 sm:p-8">
        <div aria-hidden="true" className="absolute top-1/2 right-8 -z-10 hidden size-44 -translate-y-1/2 opacity-30 md:block lg:right-12 lg:size-48 dark:opacity-45">
          <Rangoli className="size-full motion-safe:animate-[spin_90s_linear_infinite]" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{today}</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-primary sm:text-4xl">{fill(greeting, { name: user.name.split(" ")[0] ?? user.name })}</h1>
        {seller && (
          <p className="mt-2 flex flex-wrap items-center gap-2 font-semibold">
            {detailsSaved && seller.companyName}
            <Badge variant={approved ? "default" : "secondary"}>{t.sellerStatuses[seller.status]}</Badge>
          </p>
        )}
        <p className="mt-2 max-w-xl text-muted-foreground">{s.status[seller?.status ?? "DRAFT"]}</p>
        {reason && <p className="mt-1 max-w-xl font-medium text-destructive">{fill(s.reason, { reason })}</p>}
        {(ready || next) && (
          <div className="mt-5 flex flex-wrap items-start gap-3">
            {ready && <SendForApproval label={s.sendForApproval} />}
            {next && (
              <Button asChild variant={ready ? "outline" : "default"} className="rounded-full">
                <Link href={next.href}>
                  {next.label}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </section>

      {approved ? (
        <>
          <section aria-labelledby="glance-heading" className="flex flex-col gap-4">
            <h2 id="glance-heading" className="text-lg font-semibold">
              {s.atAGlance}
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard href="/seller/products" label={s.statProducts} value={products.length} highlight />
              <StatCard href="/seller/products" label={s.statLive} value={products.filter((p) => isLive(p, subscriptionActive)).length} />
              <StatCard href="/seller/inquiries" label={s.statInquiriesWeek} value={inquiriesThisWeek} />
              <StatCard href="/seller/inquiries" label={s.statInquiriesAll} value={inquiriesAll} />
            </ul>
          </section>
          <section aria-labelledby="subscription-heading" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="subscription-heading" className="font-semibold">
                {s.subscription}
              </h2>
              <Link href="/seller/subscription" className="text-sm font-medium text-primary underline">
                {s.subscriptionDetails}
              </Link>
            </div>
            <SubscriptionStatus state={subscriptionState(seller.paidUntil, indiaToday())} paidUntil={seller.paidUntil} />
          </section>
        </>
      ) : (
        <section aria-labelledby="steps-heading" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="steps-heading" className="text-lg font-semibold">
              {s.stepsTitle}
            </h2>
            <p className="text-sm text-muted-foreground">{s.reviewTogether}</p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {steps.map((step, i) => (
              <li key={step.title}>
                <Link href={step.href} className={cn("flex h-full items-start gap-3 rounded-2xl border bg-card p-5 no-underline transition-colors hover:border-primary", step.done ? "border-success" : "border-border")}>
                  <span aria-hidden="true" className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", step.done ? "bg-success text-background" : "bg-secondary")}>
                    {step.done ? <CircleCheck className="size-5" /> : i + 1}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="font-semibold">{step.title}</span>
                    <span className="text-sm text-muted-foreground">{step.status}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* The product listing: what buyers find. Opens with the company verification, approved together with it. */}
      <section aria-labelledby="listing-heading" className="flex flex-col gap-4">
        {/* "Add a product" is the greeting's button. */}
        <h2 id="listing-heading" className="text-lg font-semibold">
          {s.products}
        </h2>
        {!listing ? (
          <SuspendedListing t={t} />
        ) : products.length === 0 ? (
          <div className="flex flex-col gap-1 rounded-2xl border border-dashed border-border bg-card p-6">
            <p className="font-semibold">{s.noProducts}</p>
            <p className="text-muted-foreground">{s.listingHow}</p>
          </div>
        ) : (
          <MyProductList products={products.slice(0, SHOWN_PRODUCTS)} subscriptionActive={subscriptionActive} awaitingLabel={approved ? undefined : seller?.status === "DRAFT" ? t.sellerStatuses.DRAFT : s.awaitingBadge} t={t} />
        )}
        {listing && (
          <Link href="/seller/products" className="w-fit text-sm font-medium text-primary underline">
            {s.manageProducts}
          </Link>
        )}
      </section>

      <section aria-labelledby="profile-heading" className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 id="profile-heading" className="text-lg font-semibold">
            {s.profile}
          </h2>
          <p className="text-sm text-muted-foreground">{seller && seller.status !== "DRAFT" ? s.profileIntro : s.profileLater}</p>
        </div>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
          {[
            [s.yourName, user.name],
            [t.sellerSignIn.username, user.username ?? "—"],
            [s.loginEmail, member.email ?? "—"],
            ...(seller && detailsSaved ? [[s.companyName, seller.companyName]] : []),
          ].map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="text-sm text-muted-foreground">{term}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
        {seller && seller.status !== "DRAFT" && (
          <div className="max-w-2xl">
            <ProfileForm
              values={{
                contactName: seller.contactName,
                contactPhone: contact?.phone ?? "",
                contactEmail: contact?.email ?? "",
                address: seller.address ?? "",
                city: seller.city,
                state: seller.state,
                description: seller.description ?? "",
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
