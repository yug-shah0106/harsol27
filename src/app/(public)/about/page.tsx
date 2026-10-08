import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/prose-page";

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
    </ProsePage>
  );
}
