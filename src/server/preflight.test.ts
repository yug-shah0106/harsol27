import { describe, expect, it } from "vitest";
import { configChecks, emailDomainCheck, hasDraftNotice } from "./preflight";

const ready = {
  BETTER_AUTH_URL: "https://www.harsol27.example",
  BETTER_AUTH_SECRET: "s".repeat(44),
  DATABASE_URL: "postgresql://harsol27:3f9a1c0e7b2d4a6f8e1c3b5d@db:5432/harsol27",
  GOOGLE_CLIENT_ID: "123-abc.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "GOCSPX-secret",
  RESEND_API_KEY: "re_live_key",
  EMAIL_FROM: "Harsol27 <hello@harsol27.example>",
  TEAM_ALERT_EMAILS: "team@harsol27.example",
  CLIENT_IP_HEADER: "cf-connecting-ip",
  S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  BACKUP_S3_BUCKET: "harsol27-backups",
};

const failing = (env: Record<string, string | undefined>) => configChecks(env).filter((c) => c.status !== "pass").map((c) => `${c.status}: ${c.label}`);

describe("go-live settings check", () => {
  it("passes a launch-ready configuration", () => {
    expect(failing(ready)).toEqual([]);
  });

  it("blocks today's staging setup, and says why", () => {
    const staging = {
      ...ready,
      BETTER_AUTH_URL: "https://harsol27.ngrok.app",
      SMS_PROVIDER: "console",
      ALLOW_CONSOLE_SMS: "true",
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
      EMAIL_FROM: "Harsol27 <onboarding@resend.dev>",
      CLIENT_IP_HEADER: "x-forwarded-for",
      S3_ENDPOINT: "http://s3:8333",
      BACKUP_S3_BUCKET: "",
      DATABASE_URL: "postgresql://harsol27:short@db:5432/harsol27",
    };
    expect(failing(staging)).toEqual([
      "warn: The site uses its own domain",
      "fail: Log-only sign-in codes are switched off",
      'warn: "Continue with Google" is set up',
      "fail: Emails come from our own domain",
      "warn: Visitor addresses come from Cloudflare",
      "fail: Files are stored in real storage (Cloudflare R2)",
      "fail: The database password is strong",
      "fail: Backups are copied off the server",
    ]);
  });

  it("refuses plain HTTP and local addresses, and never prints secrets", () => {
    expect(failing({ ...ready, BETTER_AUTH_URL: "http://localhost:3000" })).toContain("fail: The site is served over HTTPS at a public address");
    const all = JSON.stringify(configChecks({ ...ready, BETTER_AUTH_SECRET: "tooshort", DATABASE_URL: "postgresql://u:pw@db/x" }));
    expect(all).not.toContain("tooshort");
    expect(all).not.toContain(":pw@");
  });

  it("recognises the draft notice on the legal pages", () => {
    expect(hasDraftNotice('<p><strong>Draft.</strong> This page is being finalised</p>')).toBe(true);
    expect(hasDraftNotice("<p>Terms of use</p>")).toBe(false);
  });

  it("asks Resend whether the sending domain is verified", () => {
    const body = { data: [{ name: "harsol27.example", status: "verified" }, { name: "other.example", status: "pending" }] };
    expect(emailDomainCheck(200, body, "harsol27.example").status).toBe("pass");
    expect(emailDomainCheck(200, body, "other.example")).toMatchObject({ status: "fail", detail: 'other.example is "pending" in Resend: add its DNS records' });
    expect(emailDomainCheck(200, body, "missing.example").status).toBe("fail");
    expect(emailDomainCheck(401, {}, "harsol27.example").status).toBe("warn"); // a sending-only key cannot list domains
    expect(emailDomainCheck(400, { message: "API key is invalid" }, "harsol27.example").detail).toBe("Resend answered 400: API key is invalid");
  });
});
