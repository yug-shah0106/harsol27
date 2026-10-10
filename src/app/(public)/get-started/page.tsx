import type { Metadata } from "next";
import { listActiveIndustries } from "@/server/industries";
import { LeadForm } from "./lead-form";

export const metadata: Metadata = {
  title: "Get started",
  description: "Tell us about your business and the Harsol27 team will get in touch.",
};

export default async function GetStartedPage() {
  const industries = await listActiveIndustries();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-primary sm:text-6xl animate-in slide-in-from-bottom-2 duration-500 ease-out">Get started with Harsol27</h1>
        <p className="text-muted-foreground">
          Share a few details about your business. Our team will contact you to help you get started.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 sm:p-8">
        <LeadForm industries={industries} />
      </div>
    </div>
  );
}
