/**
 * The seller fee (client decisions, 2026-10-15): ₹1,000 for 15 months, or ₹500 when paid by
 * 24 November 2026 (India time). Paid to the team by UPI; the Seller registration form shows it.
 */
export const FEE = { months: 15, regular: 1000, offer: 500, offerLastDay: "2026-11-24" } as const;

/**
 * The client's UPI QR code (public/): their printed Punjab National Bank code, module for module, in the
 * Marigold colours. The page shows the SVG; the "save the QR code" link saves the PNG, which UPI apps can open
 * from the phone's photos.
 */
export const PAYMENT_QR_SRC = "/payment-qr.svg";
export const PAYMENT_QR_DOWNLOAD = "/payment-qr.png";

/** Where the fee goes (client details, 2026-10-19): the QR code's UPI ID, and the bank account for transfers. */
export const PAYMENT_ACCOUNT = {
  name: "Shree Harsol Sattavis Jain Yuvak Trust",
  upiId: "9152000352m@pnb",
  bank: "Punjab National Bank",
  branch: "Thane-Bhayander (W)",
  accountNumber: "09952191031725",
  ifsc: "PUNB0099510",
} as const;

export type FeeToday = { amount: number; regular: number; months: number; offerLastDay: string | null };

/** The fee on `day`, an India-time "YYYY-MM-DD" date. */
export function feeOn(day: string): FeeToday {
  const offer = day <= FEE.offerLastDay;
  return { amount: offer ? FEE.offer : FEE.regular, regular: FEE.regular, months: FEE.months, offerLastDay: offer ? FEE.offerLastDay : null };
}

export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** "2026-11-24" → "24 November 2026". */
export const longDate = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
