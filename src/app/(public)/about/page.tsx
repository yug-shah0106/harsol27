import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProsePage } from "@/components/prose-page";
import { pageMetadata } from "@/lib/seo";
import { getMessages } from "@/server/locale";

export const metadata: Metadata = pageMetadata({
  title: "About Harsol27 and how it works",
  description: "How Harsol27, by the Harsol Sattavis (27) Jain community, works: approved Harsol sellers, direct enquiries, no online payment, and common questions.",
  path: "/about",
  keywords: ["how Harsol27 works", "Harsol27 FAQ", "sell on Harsol27"],
});

// Answers only from what the site does: no promises it doesn't keep (texts in src/i18n, `about`).
export default async function AboutPage() {
  const { about: a } = await getMessages();
  return (
    <ProsePage title={a.title} lead={a.lead}>
      <p>{a.intro}</p>
      <h2>{a.buyersTitle}</h2>
      <p>{a.buyers}</p>
      <h2>{a.sellersTitle}</h2>
      <p>{a.sellers}</p>
      <h2>{a.notTitle}</h2>
      <p>{a.not}</p>
      <p>
        {a.join}
        <Link href="/Seller-Registration" className="font-medium text-primary underline">
          {a.joinLink}
        </Link>
      </p>

      <h2 id="faq">{a.faqTitle}</h2>
      {/* Native <details>: opens with a click, Enter or Space, and works without JavaScript. */}
      <div className="flex flex-col border-t border-border">
        {a.faq.map(({ q, a: answer, link, after }) => (
          <details key={q} className="group border-b border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
              {q}
              <Plus aria-hidden="true" className="size-5 shrink-0 text-primary transition-transform duration-300 group-open:rotate-45" />
            </summary>
            <p className="pb-4 text-muted-foreground">
              {answer}
              {link && (
                <Link href={link.href} className="font-medium text-primary underline">
                  {link.text}
                </Link>
              )}
              {after}
            </p>
          </details>
        ))}
      </div>
    </ProsePage>
  );
}
