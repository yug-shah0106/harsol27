import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { HeroSky, Rooftops } from "@/components/hero/hero-sky";
import { KitePoster } from "@/components/hero/kite-poster";
import { BlurText, ScrollText } from "@/components/motion-text";
import { SearchForm } from "@/components/search-form";
import { Button } from "@/components/ui/button";
import { listActiveIndustries } from "@/server/industries";

const STEPS = [
  {
    title: "Search",
    body: "Look up a product or browse by industry to find approved sellers from across Gujarat.",
  },
  {
    title: "Send an enquiry",
    body: "Tell the seller what you need. Sending an enquiry shows you their phone number and email.",
  },
  {
    title: "Talk directly",
    body: "Call or email the seller and agree the deal directly between yourselves.",
  },
];

// Why buyers use Harsol27: what the About page says, nothing more.
const REASONS = [
  { title: "Approved sellers only", body: "Sellers apply to join, and our team approves each one before they appear on Harsol27." },
  { title: "Straight to the seller", body: "Send an enquiry and you see the seller's phone number and email, so you can speak to them yourself." },
  { title: "Your deal, your terms", body: "No cart and no online payment. Price, quantity, delivery and payment are agreed between you and the seller." },
  { title: "From khakhra to steel", body: "Gujarat makes and trades almost everything. Search for a product, or browse by industry." },
];
// The stacked cards stick a little lower each, and lean a little, so the pile fans out.
const STACK = ["top-24 -rotate-1", "top-28 rotate-1", "top-32 -rotate-1", "top-36 rotate-1"];

const MARQUEE = ["Manufacturers", "Wholesalers", "Traders"];

const pad = (n: number) => String(n).padStart(2, "0");
const DISPLAY_HEADING = "font-display text-5xl leading-none tracking-tight text-primary sm:text-7xl";

export default async function HomePage() {
  const industries = await listActiveIndustries();

  return (
    <>
      <section aria-labelledby="hero-heading" className="kite-sky relative isolate overflow-hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 pt-12 sm:px-6 sm:pt-16 lg:min-h-[calc(100svh-4rem)] lg:justify-center lg:pt-12 lg:pb-40">
          <p className="w-fit rounded-full border border-primary/25 bg-card/70 px-3.5 py-1 text-xs font-semibold tracking-[0.18em] text-primary uppercase animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out fill-mode-both">
            B2B marketplace for Gujarat
          </p>
          {/* The headline only slides (never fades): it is the largest paint, which must not wait. */}
          <h1
            id="hero-heading"
            className="font-display text-[clamp(2.75rem,1.2rem+6vw,6.75rem)] leading-[0.95] tracking-tight text-balance text-primary animate-in slide-in-from-bottom-4 duration-700 ease-out"
          >
            Find the right supplier. Then just{" "}
            <span className="relative isolate whitespace-nowrap italic">
              call them.
              <span aria-hidden="true" className="animate-draw absolute inset-x-0 bottom-[0.16em] -z-10 h-[0.26em] bg-accent" />
            </span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150 ease-out fill-mode-both">
            From khakhra makers to steel fabricators, Harsol27 lists approved manufacturers, wholesalers and traders,
            and puts you in direct touch with them.
          </p>
          <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-3 duration-700 delay-300 ease-out fill-mode-both">
            <SearchForm compact />
          </div>
          <div className="flex flex-wrap gap-3 animate-in fade-in duration-700 delay-500 ease-out fill-mode-both">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/industries">Browse by industry</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>
        </div>
        {/* Kites at Uttarayan: a static picture first, then live 3D (see components/hero). From 1024px they fly
            on the right, behind the headline, fading out towards it so the words stay clear. */}
        <div
          data-parallax="10"
          className="relative -z-10 mx-auto aspect-square w-full max-w-md print:hidden lg:absolute lg:-right-[4%] lg:bottom-0 lg:h-full lg:w-auto lg:max-w-none lg:[mask-image:linear-gradient(to_right,transparent_5%,black_45%)]"
        >
          <div className="size-full animate-in fade-in zoom-in-95 duration-1000 delay-200 ease-out fill-mode-both">
            <HeroSky poster={<KitePoster />} className="relative size-full" />
          </div>
        </div>
        <Rooftops className="absolute inset-x-0 bottom-0 -z-10 h-20 w-full print:hidden sm:h-28 lg:h-32" />
      </section>

      {/* Who is on Harsol27, drifting past (decorative: the hero says it in words). */}
      <div aria-hidden="true" className="overflow-hidden border-y border-border bg-secondary py-5 text-primary print:hidden sm:py-7">
        <div data-marquee className="flex w-max">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {[...MARQUEE, ...MARQUEE].map((word, i) => (
                <span key={i} className="flex items-center font-display text-4xl italic sm:text-7xl">
                  <span className="px-6 sm:px-10">{word}</span>
                  <span className="size-2 rotate-45 bg-primary/40 sm:size-2.5" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-36">
        <ScrollText
          text="Gujarat is full of businesses that make and trade almost everything. Harsol27 helps buyers find the right one and talk to them directly."
          className="max-w-5xl font-display text-4xl leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl"
        />
      </div>

      <section aria-labelledby="why-heading" className="bg-sage">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <BlurText id="why-heading" text="Why Harsol27?" className={DISPLAY_HEADING} />
            <p data-reveal className="max-w-md text-lg text-muted-foreground">
              A business-to-business marketplace for Gujarat&apos;s manufacturers, wholesalers and traders.
            </p>
          </div>
          <ol data-stack className="flex flex-col gap-[14vh]">
            {REASONS.map((reason, i) => (
              <li key={reason.title} className={`sticky ${STACK[i]}`}>
                <div className="flex min-h-64 flex-col justify-between gap-10 rounded-2xl border border-border bg-card p-7 shadow-xl shadow-primary/10 sm:p-9">
                  <span aria-hidden="true" className="font-display text-xl text-primary italic">
                    {pad(i + 1)}
                  </span>
                  <div className="flex flex-col gap-3">
                    <h3 className="font-display text-3xl leading-tight text-primary sm:text-4xl">{reason.title}</h3>
                    <p className="text-base text-muted-foreground sm:text-lg">{reason.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-4 overflow-x-clip">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <BlurText id="how-heading" text="How it works" className={DISPLAY_HEADING} />
          <ol className="mt-12 sm:mt-16">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative grid gap-4 py-8 sm:grid-cols-[4rem_1fr] sm:py-12">
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-border" />
                <span aria-hidden="true" data-draw className="absolute inset-x-0 top-0 h-px origin-left bg-primary" />
                <span aria-hidden="true" className="font-display text-xl text-muted-foreground italic sm:pt-4">
                  {pad(i + 1)}
                </span>
                <div className={`flex flex-col gap-4 ${i % 2 ? "sm:items-end sm:text-right" : ""}`}>
                  <h3 data-slide={i % 2 ? "right" : "left"} className="font-display text-[clamp(2.75rem,1rem+6vw,6.5rem)] leading-none tracking-tight text-primary">
                    <span className="sr-only">Step {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p data-reveal className="max-w-md text-lg text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {industries.length > 0 && (
        <section aria-labelledby="industries-heading" className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex max-w-3xl flex-col gap-4">
                <BlurText id="industries-heading" text="Industries on Harsol27" className={DISPLAY_HEADING} />
                <p data-reveal className="max-w-xl text-lg text-muted-foreground">
                  Sellers choose their main industry and list their own products within it.
                </p>
              </div>
              <Button asChild variant="outline" className="w-fit shrink-0 rounded-full">
                <Link href="/industries">
                  All industries
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <ul className="mt-12 grid gap-x-10 sm:grid-cols-2">
              {industries.map((industry, i) => (
                <li key={industry.id} data-reveal>
                  {/* Blush fills the row from below on hover or focus. */}
                  <Link
                    href={`/industries/${industry.slug}`}
                    className="group relative isolate flex items-center gap-4 border-b border-border px-2 py-5 no-underline before:absolute before:inset-0 before:-z-10 before:origin-bottom before:scale-y-0 before:bg-accent before:transition-transform before:duration-500 before:ease-[cubic-bezier(0.65,0,0.35,1)] hover:before:scale-y-100 focus-visible:before:scale-y-100"
                  >
                    <span aria-hidden="true" className="w-7 shrink-0 text-sm font-semibold text-muted-foreground tabular-nums group-hover:text-foreground group-focus-visible:text-foreground">
                      {pad(i + 1)}
                    </span>
                    <span className="flex-1 font-display text-2xl leading-tight sm:text-3xl">{industry.name}</span>
                    <ArrowUpRight aria-hidden="true" className="size-5 shrink-0 transition-transform duration-300 group-hover:rotate-45" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section aria-labelledby="cta-heading" className="overflow-x-clip bg-accent">
        <div className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6 sm:pt-32">
          <h2 id="cta-heading" className="font-display text-[clamp(3.25rem,1rem+11vw,11.5rem)] leading-[0.9] tracking-tight">
            <span data-slide="left" className="block">
              Sell everything on
            </span>{" "}
            <span data-slide="right" className="block text-right text-primary italic">
              Harsol27
            </span>
          </h2>
          <div data-reveal className="mt-12 flex flex-col gap-6 border-t border-foreground/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-lg">
              Share a few details about your business and our team will get in touch, or apply as a seller right away.
            </p>
            <Button asChild size="lg" data-magnet className="w-fit rounded-full px-8">
              <Link href="/get-started">Get started</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
