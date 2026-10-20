import { Mail, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/contact";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact us",
  description: `Questions about Harsol27 or Seller registration? WhatsApp the Harsol27 team on ${CONTACT.whatsapp} or email ${CONTACT.email}.`,
  path: "/contact",
  keywords: ["contact Harsol27", "Harsol27 WhatsApp", "Harsol27 email"],
});

const CARD = "flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6";
const ICON = "grid size-12 place-items-center rounded-full bg-secondary text-primary";

/** The team's contact: WhatsApp and email (the footer's "Contact us" link, and the floating "Talk to us" opens WhatsApp). */
export default function ContactPage() {
  return (
    <ProsePage title="Contact us" lead="Questions about Harsol27 or Seller registration? WhatsApp or email us, and our team will get back to you.">
      <p lang="gu" className="w-fit rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-primary">
        કોઈ પ્રશ્ન છે? અમારો સંપર્ક કરો.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={CARD}>
          <span className={ICON}>
            <MessageCircle aria-hidden="true" className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">WhatsApp</p>
            <p className="text-xl font-semibold">{CONTACT.whatsapp}</p>
          </div>
          <Button asChild className="rounded-full">
            <a href={CONTACT.whatsappLink} target="_blank" rel="noopener noreferrer">
              Chat on WhatsApp
            </a>
          </Button>
        </div>
        <div className={CARD}>
          <span className={ICON}>
            <Mail aria-hidden="true" className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-xl font-semibold break-all">{CONTACT.email}</p>
          </div>
          <Button asChild variant="outline" className="rounded-full bg-card">
            <a href={`mailto:${CONTACT.email}`}>Write an email</a>
          </Button>
        </div>
      </div>
    </ProsePage>
  );
}
