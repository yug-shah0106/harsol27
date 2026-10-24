import { Mail, MapPin, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";
import { Button } from "@/components/ui/button";
import { ADDRESS_MAPS_LINK, CONTACT } from "@/lib/contact";
import { pageMetadata } from "@/lib/seo";
import { getMessages } from "@/server/locale";

export const metadata: Metadata = pageMetadata({
  title: "Contact us",
  description: `Questions about Harsol27 or Seller registration? WhatsApp the Harsol27 team on ${CONTACT.whatsapp} or email ${CONTACT.email}.`,
  path: "/contact",
  keywords: ["contact Harsol27", "Harsol27 WhatsApp", "Harsol27 email"],
});

const CARD = "flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6";
const ICON = "grid size-12 place-items-center rounded-full bg-secondary text-primary";

/** The team's contact: WhatsApp, email and the trust's address (the footer's "Contact us" link). */
export default async function ContactPage() {
  const { contact: c } = await getMessages();
  return (
    <ProsePage title={c.title} lead={c.lead}>
      {c.accent && (
        <p lang={c.accent.lang} className="w-fit rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-primary">
          {c.accent.text}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={CARD}>
          <span className={ICON}>
            <MessageCircle aria-hidden="true" className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{c.whatsapp}</p>
            <p className="text-xl font-semibold">{CONTACT.whatsapp}</p>
          </div>
          <Button asChild className="rounded-full">
            <a href={CONTACT.whatsappLink} target="_blank" rel="noopener noreferrer">
              {c.chat}
            </a>
          </Button>
        </div>
        <div className={CARD}>
          <span className={ICON}>
            <Mail aria-hidden="true" className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{c.email}</p>
            <p className="text-xl font-semibold break-all">{CONTACT.email}</p>
          </div>
          <Button asChild variant="outline" className="rounded-full bg-card">
            <a href={`mailto:${CONTACT.email}`}>{c.write}</a>
          </Button>
        </div>
        <div className={`${CARD} sm:col-span-2`}>
          <span className={ICON}>
            <MapPin aria-hidden="true" className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{c.address}</p>
            <p className="font-semibold">{c.trust}</p>
            <address className="text-lg not-italic">
              {CONTACT.address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </div>
          <Button asChild variant="outline" className="rounded-full bg-card">
            <a href={ADDRESS_MAPS_LINK} target="_blank" rel="noopener noreferrer">
              {c.maps}
            </a>
          </Button>
        </div>
      </div>
    </ProsePage>
  );
}
