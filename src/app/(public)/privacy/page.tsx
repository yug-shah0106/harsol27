import type { Metadata } from "next";
import { DraftNotice, ProsePage } from "@/components/prose-page";
import { CONTACT } from "@/lib/contact";
import { pageMetadata } from "@/lib/seo";
import { getLocale } from "@/server/locale";
import { PrivacyGu, PrivacyHi } from "./translations";

export const metadata: Metadata = pageMetadata({
  title: "Privacy policy",
  description: "What Harsol27 collects through its forms, how it is used, who can see it, and the essential cookies the site sets. No advertising or tracking cookies.",
  path: "/privacy",
  keywords: ["Harsol27 privacy"],
});

// Draft written from what the code actually collects (updated 2026-10-21: who is responsible, seller logins and
// their encrypted passwords, the services that hold the data). Questions go to the team's contact (lib/contact.ts).
// How long registrations are kept, and requests to delete them, wait for the client's decision. Legal review is
// required before launch (see docs/FUTURE.md). 2026-10-24: the language cookie; Hindi and Gujarati (translations.tsx);
// buyer accounts, inquiries and selling, now the full site is open.
const TITLE = { en: "Privacy policy", hi: "गोपनीयता नीति", gu: "ગોપનીયતા નીતિ" } as const;

export default async function PrivacyPage() {
  const locale = await getLocale();
  return (
    <ProsePage title={TITLE[locale]} updated="2026-10-24">
      <DraftNotice />
      {locale === "hi" ? <PrivacyHi /> : locale === "gu" ? <PrivacyGu /> : <PrivacyEn />}
    </ProsePage>
  );
}

function PrivacyEn() {
  return (
    <>
      <h2>Who we are</h2>
      <p>
        Harsol27 is run by the Shree Harsol Sattavis Jain Yuvak Trust, Bhayander. The trust is responsible for the information
        described here.
      </p>
      <h2>What we collect through the Seller registration form</h2>
      <ul>
        <li>Your first name, your middle name and your last name, your WhatsApp number and email address.</li>
        <li>Your native place, and your address, city, state and pincode.</li>
        <li>If you give them: your business&apos;s website, Instagram name and Google Maps link.</li>
        <li>A screenshot of your payment. It is kept in private storage, and only the Harsol27 team can open it.</li>
        <li>Your business category and industry.</li>
        <li>
          The IP address and browser details of the device used to send the form. These are used only to investigate
          abuse such as spam, are visible only to Harsol27 staff, and are deleted automatically after 30 days.
        </li>
        <li>
          If you came to Harsol27 through a link with campaign tags (the <code>utm_</code> parts of a web address, such
          as <code>utm_source=newsletter</code>), which campaign it was. This helps us see which of our messages work.
        </li>
      </ul>
      <h2>If you have a seller login</h2>
      <ul>
        <li>Your username, and the mobile number on your account.</li>
        <li>
          Your password, which our team sets. It is stored encrypted, and our admins can see it so they can send it to you
          again if you forget it.
        </li>
        <li>When you sign in, and failed attempts to sign in (used to lock out password guessing for a while).</li>
        <li>Whether your registration and your payment were approved, and your subscription&apos;s dates.</li>
      </ul>
      <h2>If you create a buyer account</h2>
      <ul>
        <li>Your name, mobile number, email address and username.</li>
        <li>
          Your password, which you choose. It is stored only as a one-way hash, so nobody can read it, our team included. If
          you forget it, our team sets a new one, which our admins can see so they can send it to you.
        </li>
        <li>When you sign in, and failed attempts to sign in (used to lock out password guessing for a while).</li>
      </ul>
      <h2>When you send an inquiry</h2>
      <ul>
        <li>The seller receives your name, mobile number and message, and you see the seller&apos;s contact name, phone number and email.</li>
        <li>
          We keep the inquiry so that you and the seller can find it again. The IP address and browser details of the device
          used are kept only to investigate misuse, are visible only to Harsol27 staff, and are deleted automatically after 30 days.
        </li>
      </ul>
      <h2>If you sell on Harsol27</h2>
      <ul>
        <li>Your business name, city, state and description, and your products and their photos, are public.</li>
        <li>Your contact name, phone number and email are shown only to buyers who send you an inquiry.</li>
        <li>The documents you upload (such as a GST certificate or PAN card) are kept in private storage, and only the Harsol27 team can open them.</li>
        <li>Product photos are resized and saved without their hidden details, such as where they were taken.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To contact you about joining Harsol27.</li>
        <li>To send you a confirmation email that we received your details.</li>
        <li>To check your payment, keep track of your subscription and give you a login.</li>
        <li>To let buyers send inquiries and see sellers&apos; contact details.</li>
        <li>To protect the site against spam and misuse.</li>
      </ul>
      <h2>Who can see it</h2>
      <p>
        Only the Harsol27 team, apart from what this policy says others see: a seller&apos;s public page and products, and the
        inquiries between a buyer and a seller. We do not sell your information. These services run the site for us and handle
        your information only to do that: Render (hosting, in Singapore), Aiven (the database, in Singapore), Cloudflare R2
        (storage for payment screenshots, documents and product photos) and Resend (sending emails). If you message us on WhatsApp, WhatsApp&apos;s own privacy policy applies to
        that chat.
      </p>
      <h2>Cookies</h2>
      <p>
        We use only essential cookies: to keep you signed in, and to remember your settings (dark mode, your language,
        and that you have seen our cookie notice). We do not use advertising or tracking cookies.
      </p>
      <h2>Questions</h2>
      <p>
        Questions about this policy or your information? Email us at <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> or
        WhatsApp us on{" "}
        <a href={CONTACT.whatsappLink} target="_blank" rel="noopener noreferrer">
          {CONTACT.whatsapp}
        </a>
        , and our team will get back to you.
      </p>
    </>
  );
}
