import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice, ProsePage } from "@/components/prose-page";
import { CONTACT } from "@/lib/contact";
import { FEE, longDate, rupees } from "@/lib/fee";
import { pageMetadata } from "@/lib/seo";
import { getLocale } from "@/server/locale";
import { TermsGu, TermsHi } from "./translations";

export const metadata: Metadata = pageMetadata({
  title: "Terms of use",
  description: "The terms for using Harsol27, the directory that connects business buyers with sellers from Harsol. Harsol27 is not a party to deals between them.",
  path: "/terms",
  keywords: ["Harsol27 terms"],
});

// Draft written from what the site actually does (updated 2026-10-21: the trust, the fee, payment checks, logins).
// Refunds and the governing law are not covered until the client decides them. Must be reviewed by the client's
// legal adviser before launch.
const TITLE = { en: "Terms of use", hi: "उपयोग के नियम", gu: "ઉપયોગના નિયમો" } as const;

export default async function TermsPage() {
  const locale = await getLocale();
  return (
    <ProsePage title={TITLE[locale]} updated="2026-10-21">
      <DraftNotice />
      {locale === "hi" ? <TermsHi /> : locale === "gu" ? <TermsGu /> : <TermsEn />}
    </ProsePage>
  );
}

function TermsEn() {
  return (
    <>
      <h2>Who runs Harsol27</h2>
      <p>
        Harsol27 is run by the Shree Harsol Sattavis Jain Yuvak Trust, Bhayander, for the Harsol Sattavis (27) Jain community.
        &ldquo;We&rdquo; and &ldquo;the Harsol27 team&rdquo; in these terms mean the trust.
      </p>
      <h2>What Harsol27 is</h2>
      <p>
        Harsol27 is a directory that connects business buyers with sellers. It is not a party to any deal made between a
        buyer and a seller.
      </p>
      <h2>No transactions on the site</h2>
      <p>
        Harsol27 has no cart and takes no orders or payments for deals between buyers and sellers. Price, quantity,
        quality, delivery and payment are agreed directly between the buyer and the seller, who are each responsible for
        their own side of the deal. (The only payment involved is the seller registration fee, below.)
      </p>
      <h2>Seller registration and the fee</h2>
      <ul>
        <li>
          Registering as a seller costs {rupees(FEE.regular)} for {FEE.months} months ({rupees(FEE.offer)} if you register by{" "}
          {longDate(FEE.offerLastDay)}). You pay by UPI or bank transfer to the trust&apos;s account shown on the{" "}
          <Link href="/Seller-Registration">Seller registration</Link> page, and add a screenshot of the payment to the form.
        </li>
        <li>
          Our team checks your details and your payment. Your subscription counts once the payment is confirmed, and runs for
          the period shown on your account page (normally {FEE.months} months from the day you registered).
        </li>
        <li>
          You do not create your own account: once your registration is approved, our team gives you a username and password.
          Keep them private. If you forget your password, contact us and we will set a new one.
        </li>
      </ul>
      <h2>Sellers</h2>
      <ul>
        <li>Sellers are reviewed and approved by the Harsol27 team before they are listed.</li>
        <li>Sellers are responsible for the accuracy of their business details and product listings.</li>
        <li>Harsol27 may hide or remove a listing or suspend a seller that breaks these terms.</li>
      </ul>
      <h2>Buyers</h2>
      <ul>
        <li>A seller&apos;s contact details are shown after you send them an enquiry.</li>
        <li>Use contact details only to discuss genuine business with that seller. Collecting them in bulk is not allowed.</li>
      </ul>
      <h2>Fair use</h2>
      <p>Do not submit false information, attempt to access accounts or data that are not yours, or disrupt the site.</p>
      <h2>Questions</h2>
      <p>
        Questions about these terms? Email us at <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> or WhatsApp us on{" "}
        <a href={CONTACT.whatsappLink} target="_blank" rel="noopener noreferrer">
          {CONTACT.whatsapp}
        </a>
        .
      </p>
    </>
  );
}
