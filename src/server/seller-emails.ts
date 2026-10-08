import { daysUntil, EXPIRED_NOTICE, EXPIRING_SOON_DAYS, formatDay, toDateInput } from "@/lib/subscription";
import { escapeHtml, type Email } from "./email";
import { emailLayout } from "./lead-emails";

export type SellerChangeForEmail = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  seller: { id: string; companyName: string; contactName: string; contactEmail: string; city: string; state: string };
};

const paragraphs = (lines: string[]) => lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("");

/** To the team: a new application, or a resubmission after a rejection. */
export function sellerApplicationAlertEmail(change: SellerChangeForEmail, to: string[], appUrl: string): Email {
  const { seller } = change;
  const link = `${appUrl}/admin/sellers/${seller.id}`;
  const what = change.fromStatus === "REJECTED" ? "Resubmitted seller application" : "New seller application";
  const lines = [`${seller.companyName}, ${seller.city}, ${seller.state}`, `Contact: ${seller.contactName}`];
  return {
    to,
    subject: `${what}: ${seller.companyName}`,
    text: [what, ...lines, "", `Review it: ${link}`].join("\n"),
    html: emailLayout(`<p><strong>${escapeHtml(what)}</strong></p>${paragraphs(lines)}<p><a href="${escapeHtml(link)}">Review it in admin</a></p>`),
    idempotencyKey: `seller-application/${change.id}`,
  };
}

/** To the seller: the outcome of a staff decision. Returns null for changes that need no email. */
export function sellerDecisionEmail(change: SellerChangeForEmail, appUrl: string): Email | null {
  const { seller } = change;
  const sellerPage = `${appUrl}/seller`;
  let subject: string;
  let lines: string[];
  if (change.toStatus === "APPROVED" && change.fromStatus === "SUSPENDED") {
    subject = "Your Harsol27 seller account is active again";
    lines = [`Your seller account for ${seller.companyName} has been reinstated.`];
  } else if (change.toStatus === "APPROVED") {
    subject = "Your Harsol27 seller application is approved";
    lines = [`Good news: ${seller.companyName} has been approved as a seller on Harsol27.`];
  } else if (change.toStatus === "REJECTED") {
    subject = "Your Harsol27 seller application was not approved";
    lines = [`We could not approve the application for ${seller.companyName}.`, `Reason: ${change.reason ?? "not given"}`, "You can correct your details or documents and apply again from your seller page."];
  } else if (change.toStatus === "SUSPENDED") {
    subject = "Your Harsol27 seller account is suspended";
    lines = [`The seller account for ${seller.companyName} has been suspended.`, `Reason: ${change.reason ?? "not given"}`];
  } else {
    return null;
  }
  const greeting = `Hello ${seller.contactName},`;
  return {
    to: seller.contactEmail,
    subject,
    text: [greeting, "", ...lines, "", `Your seller page: ${sellerPage}`].join("\n"),
    html: emailLayout(`<p>${escapeHtml(greeting)}</p>${paragraphs(lines)}<p><a href="${escapeHtml(sellerPage)}">Open your seller page</a></p>`),
    idempotencyKey: `seller-decision/${change.id}`,
  };
}

export type InquiryForEmail = {
  id: string;
  buyerName: string;
  buyerPhone: string;
  message: string;
  product: { name: string } | null;
  seller: { companyName: string; contactName: string; contactEmail: string };
};

/** To the seller: a buyer sent an inquiry. Includes the buyer's phone so the seller can call back. */
export function newInquiryEmail(inquiry: InquiryForEmail, appUrl: string): Email {
  const about = inquiry.product ? `about ${inquiry.product.name}` : "for your business";
  const link = `${appUrl}/seller/inquiries`;
  const lines: [string, string][] = [
    ["From", inquiry.buyerName],
    ["Phone", inquiry.buyerPhone],
    ...(inquiry.product ? [["Product", inquiry.product.name] as [string, string]] : []),
  ];
  return {
    to: inquiry.seller.contactEmail,
    subject: `New inquiry ${about} · Harsol27`,
    text: [
      `Hello ${inquiry.seller.contactName},`,
      "",
      `You have a new inquiry ${about}.`,
      ...lines.map(([k, v]) => `${k}: ${v}`),
      "",
      inquiry.message,
      "",
      `All your inquiries: ${link}`,
    ].join("\n"),
    html: emailLayout(
      `<p>Hello ${escapeHtml(inquiry.seller.contactName)},</p><p>You have a new inquiry ${escapeHtml(about)}.</p>` +
        `<table style="border-collapse:collapse">${lines
          .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#5e5650">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`)
          .join("")}</table>` +
        `<p style="white-space:pre-line;border-left:3px solid #ddd5c8;padding-left:12px">${escapeHtml(inquiry.message)}</p>` +
        `<p><a href="${escapeHtml(link)}">See all your inquiries</a></p>`,
    ),
    idempotencyKey: `inquiry/${inquiry.id}`,
  };
}

export type ReminderForEmail = {
  id: string;
  paidUntil: Date;
  daysBefore: number;
  seller: { companyName: string; contactName: string; contactEmail: string };
};

/**
 * To the seller: a renewal reminder (30, 7 or 1 days before), or the notice that their listings are
 * now hidden. Replies go to the team, who record the renewal. `today` is the date in India.
 */
export function subscriptionReminderEmail(reminder: ReminderForEmail, teamEmails: string[], appUrl: string, today: Date): Email {
  const { seller } = reminder;
  const until = formatDay(reminder.paidUntil);
  const link = `${appUrl}/seller/subscription`;
  let subject: string;
  let lines: string[];
  if (reminder.daysBefore === EXPIRED_NOTICE) {
    subject = "Your Harsol27 listings are now hidden";
    lines = [
      `The yearly subscription for ${seller.companyName} was paid until ${until}, so your products are no longer shown to buyers.`,
      "Your account, products and inquiries are all kept. Reply to this email to renew; your listings come back as soon as the renewal is recorded.",
    ];
  } else {
    const left = daysUntil(reminder.paidUntil, today);
    const when = left <= 0 ? "today" : left === 1 ? "tomorrow" : `in ${left} days`;
    subject = `Your Harsol27 subscription ends ${left <= 1 ? when : `on ${until}`}`;
    lines = [
      `The yearly subscription for ${seller.companyName} is paid until ${until} (${when}).`,
      `To keep your products visible to buyers after that, please renew: reply to this email and our team will help you.`,
    ];
  }
  const greeting = `Hello ${seller.contactName},`;
  return {
    to: seller.contactEmail,
    replyTo: teamEmails,
    subject,
    text: [greeting, "", ...lines, "", `Your subscription: ${link}`].join("\n"),
    html: emailLayout(`<p>${escapeHtml(greeting)}</p>${paragraphs(lines)}<p><a href="${escapeHtml(link)}">See your subscription</a></p>`),
    idempotencyKey: `subscription-reminder/${reminder.id}`,
  };
}

type SummarySeller = { id: string; companyName: string; contactName: string; contactPhone: string; city: string; paidUntil: Date | null };
export type SubscriptionSummary = { today: Date; expiring: SummarySeller[]; expired: SummarySeller[] };

/** To the team, weekly: who to call about renewing. Null when there is nobody to call. */
export function subscriptionSummaryEmail(summary: SubscriptionSummary, to: string[], appUrl: string): Email | null {
  const { today, expiring, expired } = summary;
  if (!expiring.length && !expired.length) return null;
  const sections = [
    [`Paid-until date in the next ${EXPIRING_SOON_DAYS} days (${expiring.length})`, expiring],
    [`Expired in the last ${EXPIRING_SOON_DAYS} days, now hidden (${expired.length})`, expired],
  ] as const;
  const row = (s: SummarySeller) => [s.companyName, s.city, s.contactName, s.contactPhone, s.paidUntil ? formatDay(s.paidUntil) : ""];
  const link = `${appUrl}/admin/subscriptions`;
  const td = (v: string) => `<td style="padding:4px 12px 4px 0;border-top:1px solid #ddd5c8">${escapeHtml(v)}</td>`;
  return {
    to,
    subject: `Subscriptions: ${expiring.length} expiring soon, ${expired.length} expired · ${formatDay(today)}`,
    text: [
      ...sections.flatMap(([title, sellers]) => [title, ...sellers.map((s) => `- ${row(s).join(" · ")}`), ""]),
      `All subscriptions: ${link}`,
    ].join("\n"),
    html: emailLayout(
      sections
        .filter(([, sellers]) => sellers.length)
        .map(
          ([title, sellers]) =>
            `<p><strong>${escapeHtml(title)}</strong></p><table style="border-collapse:collapse">` +
            `<tr>${["Company", "City", "Contact", "Phone", "Paid until"].map((h) => `<th style="text-align:left;padding:4px 12px 4px 0">${h}</th>`).join("")}</tr>` +
            sellers.map((s) => `<tr>${row(s).map(td).join("")}</tr>`).join("") +
            `</table>`,
        )
        .join("") + `<p><a href="${escapeHtml(link)}">Open subscriptions in admin</a></p>`,
    ),
    idempotencyKey: `subscription-summary/${toDateInput(today)}`,
  };
}
