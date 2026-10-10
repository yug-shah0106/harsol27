import type { Metadata } from "next";
import { DraftNotice, ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Terms of use" };

// Draft written from what the site actually does. Must be reviewed by the client's legal adviser before launch.
export default function TermsPage() {
  return (
    <ProsePage title="Terms of use" updated="2026-10-08">
      <DraftNotice />
      <h2>What Harsol27 is</h2>
      <p>
        Harsol27 is a directory that connects business buyers with sellers. It is not a party to any deal made between a
        buyer and a seller.
      </p>
      <h2>No transactions on the site</h2>
      <p>
        Harsol27 has no cart, takes no orders and handles no payments. Price, quantity, quality, delivery and payment are
        agreed directly between the buyer and the seller, who are each responsible for their own side of the deal.
      </p>
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
    </ProsePage>
  );
}
