export type Email = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  /** Same key → Resend sends at most once within 24 h, so a retried job cannot double-send. */
  idempotencyKey: string;
};

export type EmailConfig = { apiKey: string; from: string };

/** Sends through Resend's HTTP API. Throws on any non-2xx so the job queue retries. */
export async function sendEmail(config: EmailConfig, email: Email): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": email.idempotencyKey,
    },
    body: JSON.stringify({ from: config.from, to: email.to, subject: email.subject, text: email.text, html: email.html }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`Resend rejected the email (HTTP ${response.status}): ${detail}`);
  }
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Every user-supplied value goes through this before it is placed in email HTML. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}
