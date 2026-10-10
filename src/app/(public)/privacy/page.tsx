import type { Metadata } from "next";
import { DraftNotice, ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Privacy policy" };

// Draft written from what the code actually collects. The contact for privacy requests is still to be
// decided by the client; legal review is required before launch (see docs/FUTURE.md).
export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy policy" updated="2026-10-10">
      <DraftNotice />
      <h2>What we collect through the Get started form</h2>
      <ul>
        <li>Your full name, phone number and email address.</li>
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
      <h2>How we use it</h2>
      <ul>
        <li>To contact you about joining Harsol27.</li>
        <li>To send you a confirmation email that we received your details.</li>
        <li>To protect the site against spam and misuse.</li>
      </ul>
      <h2>Who can see it</h2>
      <p>
        Only Harsol27 staff. Emails are delivered through our email provider. We do not sell your information.
      </p>
      <h2>Cookies</h2>
      <p>
        We use only essential cookies: to keep you signed in, and to remember your settings (dark mode, and that you
        have seen our cookie notice). We do not use advertising or tracking cookies.
      </p>
    </ProsePage>
  );
}
