import { BUSINESS_CATEGORIES } from "@/lib/lead-schema";
import { escapeHtml, type Email } from "./email";

export type LeadForEmail = {
  id: string;
  fullName: string;
  firstName?: string | null;
  fatherName: string | null;
  nativePlace: string | null;
  address: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  website?: string | null;
  instagram?: string | null;
  mapsLink?: string | null;
  paymentProofKey?: string | null;
  phone: string;
  email: string;
  businessCategory: string;
  industryName: string;
  createdAt: Date;
};

const categoryLabel = (value: string) => BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export function emailLayout(bodyHtml: string): string {
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1f1a17;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">${bodyHtml}<p style="color:#5e5650;font-size:13px;margin-top:32px">Harsol27</p></body></html>`;
}

function detailsTable(rows: [string, string][]): string {
  return `<table style="border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#5e5650">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`)
    .join("")}</table>`;
}

/** Sent to the person who filled in the lead form. */
export function leadConfirmationEmail(lead: LeadForEmail): Email {
  const rows: [string, string][] = [
    ["Category", categoryLabel(lead.businessCategory)],
    ["Industry", lead.industryName],
    ["WhatsApp number", lead.phone],
  ];
  const name = lead.firstName ?? lead.fullName;
  return {
    to: lead.email,
    subject: "We have received your details · Harsol27",
    text: [
      `Hello ${name},`,
      "",
      "Thank you for your interest in Harsol27. We have received your details and our team will contact you.",
      "",
      ...rows.map(([k, v]) => `${k}: ${v}`),
      "",
      "If you did not fill in this form, you can ignore this email.",
    ].join("\n"),
    html: emailLayout(
      `<p>Hello ${escapeHtml(name)},</p><p>Thank you for your interest in Harsol27. We have received your details and our team will contact you.</p>${detailsTable(rows)}<p style="color:#5e5650">If you did not fill in this form, you can ignore this email.</p>`,
    ),
    idempotencyKey: `lead-confirmation/${lead.id}`,
  };
}

/** Sent to the team. Links straight to the lead in the admin area. */
export function leadTeamAlertEmail(lead: LeadForEmail, to: string[], appUrl: string): Email {
  const link = `${appUrl}/admin/leads/${lead.id}`;
  const rows: [string, string][] = [
    ["Name", lead.fullName],
    ["Middle name", lead.fatherName ?? "Not given"],
    ["Native place", lead.nativePlace ?? "Not given"],
    ["Address", lead.address ?? "Not given"],
    ["City", lead.city ?? "Not given"],
    ["State", lead.state ?? "Not given"],
    ["Pincode", lead.pincode ?? "Not given"],
    ["WhatsApp number", lead.phone],
    ["Email", lead.email],
    ["Category", categoryLabel(lead.businessCategory)],
    ["Industry", lead.industryName],
    ["Website", lead.website ?? "Not given"],
    ["Instagram", lead.instagram ? `@${lead.instagram}` : "Not given"],
    ["Google Maps", lead.mapsLink ?? "Not given"],
    ["Payment screenshot", lead.paymentProofKey ? "Added: open the lead in admin to check it" : "Not added"],
    ["Received", `${lead.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST`],
  ];
  return {
    to,
    subject: `New lead: ${lead.fullName} (${lead.industryName})`,
    text: [...rows.map(([k, v]) => `${k}: ${v}`), "", `Open in admin: ${link}`].join("\n"),
    html: emailLayout(`<p><strong>New lead</strong></p>${detailsTable(rows)}<p><a href="${escapeHtml(link)}">Open in admin</a></p>`),
    idempotencyKey: `lead-team-alert/${lead.id}`,
  };
}
