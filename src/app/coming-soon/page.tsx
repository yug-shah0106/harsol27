import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CallArt, DealArt, Rangoli, SealArt, Toran } from "@/components/festive";
import { pageMetadata } from "@/lib/seo";
import { Motion } from "@/components/motion";
import { CountUp } from "@/components/motion-text";
import { RotatingWord } from "@/components/rotating-word";
import { SiteFooter, SiteHeader, SkipLink } from "@/components/site-header";
import { StartAtTop } from "@/components/start-at-top";
import { Button } from "@/components/ui/button";
import { feeOn, longDate, rupees } from "@/lib/fee";
import { listActiveIndustries } from "@/server/industries";
import { indiaToday } from "@/server/visibility";

// Served at "/" before launch, so that is its address.
export const metadata: Metadata = pageMetadata({
  title: { absolute: "Harsol27 · Harsol Sattavis Jain B2B marketplace, coming soon" },
  description: "Harsol27, by the Harsol Sattavis (27) Jain community, is a B2B marketplace for Harsol's manufacturers, wholesalers and traders. Register as a seller today.",
  path: "/",
  keywords: ["Harsol27 launch", "seller registration Harsol"],
});

const AUDIENCE = ["manufacturers", "wholesalers", "traders"] as const;
const INTRO =
  "Harsol27, the B2B marketplace for Harsol's manufacturers, wholesalers and traders, is almost ready. Soon you can find approved sellers from across Harsol and talk to them directly.";
// What is coming, in the About page's words (the home page's "Why Harsol27?").
const PROMISES = [
  { title: "Approved sellers only", body: "Sellers apply to join, and our team approves each one before they appear on Harsol27.", Art: SealArt, tint: "arch-kumkum" },
  { title: "Straight to the seller", body: "Send an enquiry and you see the seller's phone number and email, so you can speak to them yourself.", Art: CallArt, tint: "arch-marigold" },
  { title: "Your deal, your terms", body: "No cart and no online payment. Price, quantity, delivery and payment are agreed between you and the seller.", Art: DealArt, tint: "arch-leaf" },
];
const STEPS = [
  { title: "Search", body: "Look up a product or browse by industry to find approved sellers from across Harsol." },
  { title: "Send an enquiry", body: "Tell the seller what you need. Sending an enquiry shows you their phone number and email." },
  { title: "Talk directly", body: "Call or email the seller and agree the deal directly between yourselves." },
];
const PETALS = ["left-[8%] top-[18%]", "right-[10%] top-[26%]", "left-[16%] bottom-[16%]", "right-[18%] bottom-[12%]"];
const pad = (n: number) => String(n).padStart(2, "0");
// Visible at load, so it enters with CSS (components/motion.tsx only animates what is below the fold).
const RISE = "animate-in fade-in slide-in-from-bottom-3 duration-700 ease-out fill-mode-both";

/**
 * Shown at "/" while the site is closed (src/lib/coming-soon.ts): the Marigold theme's festival page.
 * A rangoli that draws itself and turns, jharokha arches, diyas, a ticket. The full site, home page
 * included, is kept as it is under (public) and opens again with COMING_SOON=false.
 */
export default async function ComingSoonPage() {
  const industries = await listActiveIndustries();
  const fee = feeOn(indiaToday().toISOString().slice(0, 10));

  return (
    <>
      <StartAtTop />
      <SkipLink />
      <Toran />
      <SiteHeader blend />

      <main id="main" className="flex-1 outline-none">
        {/* Hero: centred on a rangoli that draws itself on load and turns as the page scrolls. It starts under
            the clear header (65px: its button, padding and hairline), so the rangoli runs up to the toran. */}
        <section className="relative isolate -mt-[65px] overflow-hidden pt-[65px]">
          <div aria-hidden="true" className="absolute top-1/2 left-1/2 -z-10 size-[min(56rem,140vw)] -translate-x-1/2 -translate-y-1/2">
            <div data-spin="140" className="size-full">
              <Rangoli className="size-full opacity-35" />
            </div>
          </div>
          <div className="mx-auto flex max-w-4xl flex-col items-center px-4 pt-20 pb-28 text-center sm:px-6 sm:pt-28 sm:pb-36">
            <p lang="gu" className={`${RISE} rounded-full bg-card/85 px-4 py-1 text-lg font-semibold text-primary`}>
              ટૂંક સમયમાં આવી રહ્યું છે
            </p>
            <p className={`${RISE} mt-2 text-xs font-bold tracking-[0.22em] text-muted-foreground uppercase delay-75`}>Coming soon</p>
            {/* The headline only slides (never fades): it is the largest paint, which must not wait. */}
            <h1 className="mt-6 font-display text-[clamp(2.9rem,1.2rem+6.4vw,7rem)] leading-[0.96] tracking-tight text-balance animate-in slide-in-from-bottom-4 duration-700 ease-out">
              Something big is about to{" "}
              <span className="relative inline-block text-primary italic">
                take off
                <svg aria-hidden="true" focusable="false" viewBox="0 0 250 14" preserveAspectRatio="none" className="hand-underline absolute inset-x-0 -bottom-[0.12em] h-[0.18em] w-full">
                  <path d="M3 9 C 45 2, 95 2, 132 7 S 212 12, 247 4" pathLength={1} fill="none" stroke="#f2a20c" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className={`${RISE} mt-8 rounded-full bg-card/85 px-5 py-1.5 text-xl font-medium delay-200 sm:text-2xl`}>
              <span className="sr-only">Made for Harsol&apos;s manufacturers, wholesalers and traders.</span>
              <span aria-hidden="true">
                Made for Harsol&apos;s <RotatingWord words={AUDIENCE} className="font-bold text-primary" />
              </span>
            </p>
            <p className={`${RISE} mt-5 max-w-xl rounded-2xl bg-background/80 px-3 py-1 text-muted-foreground delay-300`}>{INTRO}</p>
            <Button asChild size="lg" className={`${RISE} mt-9 h-13 rounded-full px-9 text-base shadow-lg shadow-primary/25 delay-500`}>
              <Link href="/Seller-Registration">Register your business</Link>
            </Button>
          </div>
        </section>

        {/* Jharokha arches: the three promises, each with an illustration in the arch, rising in. */}
        <section aria-labelledby="why-heading" className="mx-auto max-w-6xl px-4 pb-28 sm:px-6">
          <h2 id="why-heading" data-reveal className="text-center font-display text-5xl tracking-tight text-primary sm:text-6xl">
            Why Harsol27?
          </h2>
          <ul className="mt-14 grid gap-6 sm:grid-cols-3">
            {PROMISES.map(({ title, body, Art, tint }) => (
              <li key={title} data-reveal className={`arch relative flex flex-col items-center gap-4 p-3 pb-9 text-center ${tint}`}>
                <span aria-hidden="true" className="arch-inner absolute inset-3" />
                {/* The same 4:3 box in every arch, so all three are the same size. */}
                <Art className="relative aspect-[4/3] w-full" />
                <h3 className="relative px-4 font-display text-3xl leading-tight tracking-tight">{title}</h3>
                <p className="relative px-4 text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Every industry as a diya: they light up one after another as you scroll. */}
        <section aria-labelledby="industries-heading" className="bg-secondary/70 py-24">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
            <h2 id="industries-heading" data-reveal className="font-display text-4xl tracking-tight sm:text-6xl">
              A festival of trades
            </h2>
            <p data-reveal className="mt-3 text-muted-foreground">
              {industries.length} industries on Harsol27, and growing.
            </p>
            <ul data-light className="mt-10 flex flex-wrap justify-center gap-2.5">
              {industries.map((industry) => (
                <li key={industry.id} data-lamp className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium">
                  <span aria-hidden="true" className="diya size-2 rounded-full bg-[#f2a20c]" />
                  {industry.name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* The three steps as medallions on a path that draws itself between them. */}
        <section aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4 py-28 sm:px-6">
          <h2 id="how-heading" data-reveal className="text-center font-display text-5xl tracking-tight text-primary sm:text-6xl">
            How it works
          </h2>
          <div className="relative mt-16">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 1000 120" preserveAspectRatio="none" className="absolute inset-x-0 top-6 hidden h-28 w-full sm:block">
              <path d="M 160 60 C 320 -10, 380 130, 500 60 S 700 -10, 840 60" pathLength={1} data-path className="drawn-path" fill="none" stroke="#f2a20c" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <ol className="relative grid gap-12 sm:grid-cols-3 sm:gap-8">
              {STEPS.map((step, i) => (
                <li key={step.title} data-reveal className="flex flex-col items-center gap-4 text-center">
                  <span aria-hidden="true" className="grid size-28 place-items-center rounded-full border-4 border-card bg-[#f2a20c] font-display text-5xl text-[#5c1a15] shadow-lg shadow-primary/20">
                    {pad(i + 1)}
                  </span>
                  <h3 className="font-display text-3xl tracking-tight">
                    <span className="sr-only">Step {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="max-w-xs text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The offer as a ticket, perforated down the middle. */}
        <section aria-labelledby="offer-heading" className="mx-auto max-w-4xl px-4 pb-28 sm:px-6">
          <div data-reveal className="ticket grid bg-card shadow-xl shadow-primary/10 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center justify-center gap-1 bg-primary px-10 py-8 text-primary-foreground">
              <p className="font-display text-7xl">
                ₹<CountUp value={fee.amount} />
              </p>
              {fee.offerLastDay && (
                <s className="text-lg opacity-80">
                  <span className="sr-only">usually </span>
                  {rupees(fee.regular)}
                </s>
              )}
            </div>
            <div className="ticket-body flex flex-col justify-center gap-2 px-8 py-8">
              <p className="font-semibold text-primary">
                <span lang="gu">સેલર રજીસ્ટ્રેશન ઓફર</span> · Seller registration offer
              </p>
              <h2 id="offer-heading" className="font-display text-3xl tracking-tight sm:text-4xl">
                {fee.months} months on Harsol27
              </h2>
              {fee.offerLastDay && <p className="font-medium">Offer till {longDate(fee.offerLastDay)}</p>}
              <p className="text-sm text-muted-foreground">Pay by UPI when you register, and add a screenshot of the payment.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="cta-heading" className="px-4 pb-20 sm:px-6">
          {/* Fixed kumkum and marigold in both modes: the festival card does not invert for dark mode. */}
          <div className="relative isolate mx-auto flex max-w-6xl flex-col items-center gap-6 overflow-hidden rounded-[2.5rem] bg-[#9c2f28] px-6 py-20 text-center text-white">
            <div aria-hidden="true" className="absolute top-1/2 left-1/2 -z-10 size-[44rem] -translate-x-1/2 -translate-y-1/2 opacity-25">
              <div data-spin="-160" className="size-full">
                <Rangoli className="size-full" />
              </div>
            </div>
            {PETALS.map((spot, i) => (
              <span key={spot} aria-hidden="true" className={`petal absolute ${spot} petal-${i + 1}`} />
            ))}
            <p lang="gu" data-reveal className="text-lg font-semibold">
              સેલર રજીસ્ટ્રેશન શરૂ થઈ ગયું છે
            </p>
            <h2 id="cta-heading" data-reveal className="font-display text-[clamp(2.75rem,1rem+6vw,6rem)] leading-[0.95] tracking-tight">
              Seller registration <span className="text-[#ffd27a] italic">is open.</span>
            </h2>
            <Button asChild size="lg" className="h-13 rounded-full bg-[#ffd27a] px-10 text-base text-[#3a2418] hover:bg-[#ffe09c]">
              <Link href="/Seller-Registration">Register your business</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />

      <Suspense fallback={null}>
        <Motion />
      </Suspense>
    </>
  );
}
