import type { Metadata } from "next";
import { cn } from "cn";
import { Rangoli } from "@/components/festive";
import { isComingSoon } from "@/lib/coming-soon";
import { feeOn } from "@/lib/fee";
import { NATIVE_PLACES } from "@/lib/lead-schema";
import { pageMetadata } from "@/lib/seo";
import { listActiveIndustries } from "@/server/industries";
import { indiaToday } from "@/server/visibility";
import { LeadForm } from "./lead-form";

// Before launch this form is the one thing open on the site, called Seller registration (src/lib/coming-soon.ts).
export function generateMetadata(): Metadata {
  const keywords = ["register business Harsol", "list my business", "sell to businesses in Harsol", "Harsol27 seller", ...NATIVE_PLACES];
  return isComingSoon()
    ? pageMetadata({
        title: "Seller registration",
        description: "Register as a seller on Harsol27, the B2B marketplace by the Harsol Sattavis (27) Jain community for Harsol's manufacturers, wholesalers and traders.",
        path: "/Seller-Registration",
        keywords: ["Harsol27 seller registration", ...keywords],
      })
    : pageMetadata({
        title: "Get started as a seller",
        description: "List your business on Harsol27, the B2B marketplace by the Harsol Sattavis (27) Jain community for Harsol's manufacturers, wholesalers and traders.",
        path: "/Seller-Registration",
        keywords,
      });
}

export default async function GetStartedPage() {
  const industries = await listActiveIndustries();
  const closed = isComingSoon();

  return (
    // Before launch the header is clear (as on the coming-soon page), so the page starts under it (65px)
    // and the rangoli runs up to the toran.
    <div className={cn("relative isolate overflow-hidden", closed && "-mt-[65px] pt-[65px]")}>
      {/* A faint rangoli in the corner, turning slowly as the page scrolls (decorative). */}
      <div aria-hidden="true" className="absolute -top-28 -right-40 -z-10 size-[30rem] opacity-25 sm:-right-24">
        <div data-spin="60" className="size-full">
          <Rangoli className="size-full" />
        </div>
      </div>
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-2">
        {closed && (
          <p lang="gu" className="w-fit rounded-full bg-card/85 px-3 py-0.5 font-semibold text-primary">
            સેલર રજીસ્ટ્રેશન શરૂ થઈ ગયું છે
          </p>
        )}
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-primary sm:text-6xl animate-in slide-in-from-bottom-2 duration-500 ease-out">
          {closed ? "Seller registration is open" : "Get started with Harsol27"}
        </h1>
        <p className="text-muted-foreground">
          {closed
            ? "Harsol27 is coming soon. Share a few details about your business and our team will get in touch."
            : "Share a few details about your business. Our team will contact you to help you get started."}
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-primary/10 sm:p-8">
        <LeadForm industries={industries} fee={feeOn(indiaToday().toISOString().slice(0, 10))} />
      </div>
    </div>
    </div>
  );
}
