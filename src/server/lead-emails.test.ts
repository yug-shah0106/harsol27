import { afterEach, describe, expect, it, vi } from "vitest";
import { escapeHtml, sendEmail } from "./email";
import { leadConfirmationEmail, leadTeamAlertEmail, type LeadForEmail } from "./lead-emails";

const lead: LeadForEmail = {
  id: "0199b5c0-0000-7000-8000-00000000abcd",
  fullName: `<script>alert("x")</script> Asha`,
  phone: "+919876543210",
  email: "asha@example.com",
  businessCategory: "TRADING",
  industryName: "Food & Snacks",
  createdAt: new Date("2026-10-07T06:30:00Z"),
};

afterEach(() => vi.unstubAllGlobals());

describe("lead emails", () => {
  it("escapes every user-supplied value in HTML but keeps plain text readable", () => {
    const email = leadConfirmationEmail(lead);
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("Food &amp; Snacks");
    expect(email.text).toContain(`Hello ${lead.fullName},`);
    expect(email.to).toBe("asha@example.com");
  });

  it("uses a stable idempotency key per lead and email type, so retries cannot double-send", () => {
    expect(leadConfirmationEmail(lead).idempotencyKey).toBe(`lead-confirmation/${lead.id}`);
    expect(leadTeamAlertEmail(lead, ["team@example.com"], "https://x.test").idempotencyKey).toBe(`lead-team-alert/${lead.id}`);
  });

  it("links the team alert to the lead in the admin area and shows India time", () => {
    const email = leadTeamAlertEmail(lead, ["a@example.com", "b@example.com"], "https://harsol27.test");
    expect(email.to).toEqual(["a@example.com", "b@example.com"]);
    expect(email.text).toContain(`https://harsol27.test/admin/leads/${lead.id}`);
    expect(email.text).toContain("12:00 pm IST"); // 06:30 UTC
  });

  it("escapes all five HTML-significant characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});

describe("sendEmail", () => {
  it("posts to Resend with the API key and idempotency key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"1"}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendEmail({ apiKey: "re_test", from: "Harsol27 <a@b.test>" }, leadConfirmationEmail(lead));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer re_test");
    expect(new Headers(init.headers).get("idempotency-key")).toBe(`lead-confirmation/${lead.id}`);
    expect(JSON.parse(String(init.body))).toMatchObject({ from: "Harsol27 <a@b.test>", to: "asha@example.com" });
  });

  it("throws on a non-2xx response so the job is retried", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })));
    await expect(sendEmail({ apiKey: "re_test", from: "a@b.test" }, leadConfirmationEmail(lead))).rejects.toThrow(/HTTP 429/);
  });
});
