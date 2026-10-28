import { Lock, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { InquiryForm } from "@/components/inquiry-form";
import { Button } from "@/components/ui/button";
import { getMember, getViewer } from "@/server/authz";
import { getSellerContact } from "@/server/contact-access";
import { getMessages } from "@/server/locale";
import { buyerDisplayName } from "@/server/inquiries";

/**
 * The seller's contact details, or the way to unlock them. The details are fetched only through
 * contact-access.ts, so they reach the page only for someone allowed to see them.
 */
export async function ContactPanel({
  sellerId,
  target,
  returnTo,
  isOwner,
  about,
}: {
  sellerId: string;
  target: { productId: string } | { sellerId: string };
  returnTo: string;
  isOwner: boolean;
  about: string;
}) {
  const viewer = await getViewer();
  const contact = await getSellerContact(viewer, sellerId);
  const { contactPanel: c } = await getMessages();

  return (
    <section aria-labelledby="contact-heading" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <h2 id="contact-heading" className="text-lg font-semibold">
        {c.title}
      </h2>
      {contact ? (
        <div className="flex flex-col gap-3">
          {!isOwner && viewer?.kind === "member" && <p className="text-sm text-success">{c.sent}</p>}
          <p className="font-medium">{contact.contactName}</p>
          <div className="flex items-center justify-between gap-3">
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-lg font-semibold text-primary underline">
              <Phone aria-hidden="true" className="size-5" /> {contact.phone}
            </a>
            <CopyButton value={contact.phone} what={c.phone} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <a href={`mailto:${contact.email}`} className="flex min-w-0 items-center gap-2 break-all text-primary underline">
              <Mail aria-hidden="true" className="size-5 shrink-0" /> {contact.email}
            </a>
            <CopyButton value={contact.email} what={c.email} />
          </div>
          {isOwner && <p className="text-sm text-muted-foreground">{c.owner}</p>}
        </div>
      ) : viewer?.kind === "member" ? (
        <>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {c.locked}
          </p>
          <InquiryForm target={target} returnTo={returnTo} defaultName={await buyerDisplayName((await getMember())!)} about={about} />
        </>
      ) : (
        <>
          <p className="flex items-start gap-2 text-muted-foreground">
            <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {c.signInFirst}
          </p>
          <Button asChild size="lg">
            <Link href={`/sign-in?next=${encodeURIComponent(returnTo)}`}>{c.signIn}</Link>
          </Button>
          <p className="text-sm">
            {c.newHere}
            <Link href={`/sign-up?next=${encodeURIComponent(returnTo)}`} className="font-semibold text-primary hover:underline">
              {c.createAccount}
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
