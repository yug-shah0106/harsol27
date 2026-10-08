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
