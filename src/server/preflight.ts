// The go-live check (scripts/preflight.ts). Each check says, in plain words, what must be true
// before real users arrive. "fail" blocks launch; "warn" is worth a look but can wait.

export type Check = { status: "pass" | "warn" | "fail"; label: string; detail?: string };
type Env = Record<string, string | undefined>;

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|s3|db|host\.docker\.internal)$/;
const hostOf = (url: string | undefined) => {
  try {
    return new URL(url ?? "").hostname;
  } catch {
    return "";
  }
};

/** Settings only: no network, no database. Never prints a secret. */
export function configChecks(env: Env): Check[] {
  const checks: Check[] = [];
  const check = (ok: boolean, label: string, detail: string, status: "fail" | "warn" = "fail") => checks.push(ok ? { status: "pass", label } : { status, label, detail });

  const appUrl = env.BETTER_AUTH_URL ?? "";
  check(appUrl.startsWith("https://") && !LOCAL_HOST.test(hostOf(appUrl)), "The site is served over HTTPS at a public address", `APP_URL is "${appUrl}"`);
  check(!/\.ngrok(-free)?\.(app|dev|io)$/.test(hostOf(appUrl)), "The site uses its own domain", "Still on the ngrok staging address", "warn");

  // Members sign in with email and password; sign-in by SMS code is switched off (docs/FUTURE.md).
  check(env.SMS_PROVIDER !== "console" && env.ALLOW_CONSOLE_SMS !== "true", "Log-only sign-in codes are switched off", "Remove SMS_PROVIDER and ALLOW_CONSOLE_SMS from the server settings");
  check(!!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET, '"Continue with Google" is set up', "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set, so the Google button is hidden", "warn");

  const from = env.EMAIL_FROM ?? "";
  const fromDomain = /@([^>\s]+)>?\s*$/.exec(from)?.[1] ?? "";
  check(!!env.RESEND_API_KEY?.startsWith("re_"), "The email service key is set", "RESEND_API_KEY is missing");
  check(!!fromDomain && !/(^|\.)resend\.dev$/.test(fromDomain), "Emails come from our own domain", fromDomain ? `EMAIL_FROM uses ${fromDomain}, Resend's test sender` : "EMAIL_FROM is missing");
  check(!!env.TEAM_ALERT_EMAILS?.trim(), "Team alerts have an address", "TEAM_ALERT_EMAILS is empty");

  check(env.CLIENT_IP_HEADER === "cf-connecting-ip", "Visitor addresses come from Cloudflare", `CLIENT_IP_HEADER is "${env.CLIENT_IP_HEADER ?? "x-forwarded-for"}" (fine until Cloudflare is in front)`, "warn");
  check(!!env.S3_ENDPOINT && !LOCAL_HOST.test(hostOf(env.S3_ENDPOINT)), "Files are stored in real storage (Cloudflare R2)", `S3_ENDPOINT is "${env.S3_ENDPOINT ?? ""}"`);

  check((env.BETTER_AUTH_SECRET ?? "").length >= 32, "The sign-in secret is long enough", "BETTER_AUTH_SECRET must be at least 32 characters");
  let dbPassword = "";
  try {
    dbPassword = decodeURIComponent(new URL(env.DATABASE_URL ?? "").password);
  } catch {
    // reported below
  }
  check(dbPassword.length >= 16, "The database password is strong", "Use at least 16 random characters (openssl rand -hex 24)");
  check(!!env.BACKUP_S3_BUCKET?.trim(), "Backups are copied off the server", "Set BACKUP_S3_* so a lost server does not mean lost data");
  return checks;
}

/** Resend's answer to GET /domains → is the sending domain verified (so emails are not marked as spam)? */
export function emailDomainCheck(status: number, body: unknown, fromDomain: string): Check {
  const label = "The email domain is verified (SPF and DKIM), so emails reach inboxes";
  if (status === 401 || status === 403) return { status: "warn", label, detail: "This key can only send; confirm the domain shows Verified in the Resend dashboard" };
  if (status !== 200) {
    const message = (body as { message?: unknown }).message;
    return { status: "fail", label, detail: `Resend answered ${status}${typeof message === "string" ? `: ${message}` : ""}` };
  }
  const domains = (body as { data?: { name: string; status: string }[] }).data ?? [];
  const found = domains.find((d) => d.name === fromDomain);
  if (!found) return { status: "fail", label, detail: `${fromDomain} is not added in Resend` };
  return found.status === "verified" ? { status: "pass", label } : { status: "fail", label, detail: `${fromDomain} is "${found.status}" in Resend: add its DNS records` };
}

/** The legal pages still carry the "Draft." notice until the client's legal review. */
export function hasDraftNotice(html: string): boolean {
  return /<strong>Draft\.<\/strong>/.test(html);
}
