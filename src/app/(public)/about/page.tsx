import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProsePage } from "@/components/prose-page";

// Answers only from what the site does (as described above): no promises it doesn't keep.
const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "How do I get a seller's phone number?",
    a: "Search for a product or browse by industry, then send the seller an enquiry. Sending it shows you their phone number and email.",
  },
  {
    q: "Can I order or pay on Harsol27?",
    a: "No. There is no cart, no online payment and no ordering. Price, quantity, delivery and payment are agreed directly between you and the seller.",
  },
  { q: "Do I need an account?", a: "Not to search and browse. To send an enquiry, sign in, or create an account with your email and a password." },
  { q: "Who can sell on Harsol27?", a: "Sellers apply to join, and our team approves each one before they appear on Harsol27." },
  {
    q: "How do I list my business?",
    a: (
      <>
        Share a few details on <Link href="/get-started" className="font-medium text-primary underline">Get started</Link> and our team will get in
        touch, or apply as a seller right away.
      </>
    ),
  },
];

export const metadata: Metadata = { title: "About", description: "What Harsol27 is and how it works." };

export default function AboutPage() {
  return (
    <ProsePage title="About Harsol27" lead="A business-to-business marketplace for Gujarat's manufacturers, wholesalers and traders.">
      <p>
        Gujarat is full of businesses that make and trade almost everything, from khakhra and thepla to steel parts and
        ceramic tiles. Harsol27 helps buyers find the right one and talk to them directly.
      </p>
      <h2>For buyers</h2>
      <p>
        Search for a product or browse by industry. When you find a seller you like, send them an enquiry: that shows you
        their phone number and email so you can speak to them yourself.
      </p>
      <h2>For sellers</h2>
      <p>
        Sellers apply to join and are approved by our team before they appear on Harsol27. Approved sellers list their
        products under their main industry and receive enquiries from interested buyers.
      </p>
      <h2>What Harsol27 does not do</h2>
      <p>
        There is no cart, no online payment and no ordering on Harsol27. Price, quantity, delivery and payment are agreed
        directly between buyer and seller.
      </p>
      <p>
        Want to join? <Link href="/get-started" className="font-medium text-primary underline">Get started here</Link>.
      </p>

      <h2 id="faq">Questions</h2>
      {/* Native <details>: opens with a click, Enter or Space, and works without JavaScript. */}
      <div className="flex flex-col border-t border-border">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group border-b border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
              {q}
              <Plus aria-hidden="true" className="size-5 shrink-0 text-primary transition-transform duration-300 group-open:rotate-45" />
            </summary>
            <p className="pb-4 text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </ProsePage>
  );
}
