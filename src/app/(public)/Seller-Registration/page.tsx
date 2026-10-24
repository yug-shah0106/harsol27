import type { Metadata } from "next";
import { Rangoli } from "@/components/festive";
import { feeOn } from "@/lib/fee";
import { HTML_LANG, industryName } from "@/lib/i18n";
import { NATIVE_PLACES } from "@/lib/lead-schema";
import { pageMetadata } from "@/lib/seo";
import { listActiveIndustries } from "@/server/industries";
import { getLocale, getMessages } from "@/server/locale";
import { indiaToday } from "@/server/visibility";
import { LeadForm } from "./lead-form";

export const metadata: Metadata = pageMetadata({
  title: "Seller registration",
  description: "Register as a seller on Harsol27, the B2B marketplace by the Harsol Sattavis (27) Jain community for Harsol's manufacturers, wholesalers and traders.",
  path: "/Seller-Registration",
  keywords: ["Harsol27 seller registration", "register business Harsol", "list my business", "sell to businesses in Harsol", "Harsol27 seller", ...NATIVE_PLACES],
});

export default async function SellerRegistrationPage() {
  const [locale, t] = [await getLocale(), await getMessages()];
  const r = t.registration;
  // In the visitor's language, A to Z in it.
  const industries = (await listActiveIndustries())
    .map((industry) => ({ id: industry.id, name: industryName(t, industry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, HTML_LANG[locale]));

  return (
    // The header is clear at the top, so the page starts under it (65px) and the rangoli runs up to the toran.
    <div className="relative isolate -mt-[65px] overflow-hidden pt-[65px]">
      {/* A faint rangoli in the corner, turning slowly as the page scrolls (decorative). */}
      <div aria-hidden="true" className="absolute -top-28 -right-40 -z-10 size-[30rem] opacity-25 sm:-right-24">
        <div data-spin="60" className="size-full">
          <Rangoli className="size-full" />
        </div>
      </div>
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-2">
        {r.accent && (
          <p lang={r.accent.lang} className="w-fit rounded-full bg-card/85 px-3 py-0.5 font-semibold text-primary">
            {r.accent.text}
          </p>
        )}
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-primary sm:text-6xl animate-in slide-in-from-bottom-2 duration-500 ease-out">
          {r.title}
        </h1>
        <p className="text-muted-foreground">
          {r.intro}
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-primary/10 sm:p-8">
        <LeadForm industries={industries} fee={feeOn(indiaToday().toISOString().slice(0, 10))} />
      </div>
    </div>
    </div>
  );
}
