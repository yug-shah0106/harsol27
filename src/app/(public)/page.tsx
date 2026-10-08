import Link from "next/link";
import { HeroSky } from "@/components/hero/hero-sky";
import { KitePoster } from "@/components/hero/kite-poster";
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

export default async function HomePage() {
  const industries = await listActiveIndustries();

  return (
    <>
      <section aria-labelledby="hero-heading" className="border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col gap-6">
          <p className="w-fit rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">
            B2B marketplace for Gujarat
          </p>
          <h1 id="hero-heading" className="max-w-3xl text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Find the right Gujarati supplier. Then just call them.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            From khakhra makers to steel fabricators, Harsol27 lists approved manufacturers, wholesalers and traders,
            and puts you in direct touch with them.
          </p>
          <SearchForm compact />
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/industries">Browse by industry</Link>
            </Button>
            <Button asChild variant="outline">
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>
          </div>
          {/* Kites at Uttarayan: a static picture first, then live 3D (see components/hero). */}
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <HeroSky poster={<KitePoster />} />
          </div>
        </div>
      </section>

      {industries.length > 0 && (
        <section aria-labelledby="industries-heading" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="industries-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Industries on Harsol27
          </h2>
          <p className="mt-2 text-muted-foreground">Sellers choose their main industry and list their own products within it.</p>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {industries.map((industry) => (
              <li key={industry.id}>
                <Link href={`/industries/${industry.slug}`} className="block h-full rounded-lg border border-border bg-card px-4 py-3 font-medium no-underline hover:border-primary">
                  {industry.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-4 border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="how-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-2">
                <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold">
                  <span className="sr-only">Step {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="cta-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start gap-4 rounded-xl bg-primary px-6 py-10 text-primary-foreground sm:px-10">
          <h2 id="cta-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Sell on Harsol27
          </h2>
          <p className="max-w-2xl">
            Share a few details about your business and our team will get in touch, or apply as a seller right away.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href="/get-started">Get started</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
