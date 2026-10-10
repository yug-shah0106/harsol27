import { describe, expect, it } from "vitest";
import { passwordResetEmail } from "./member-emails";

describe("password reset email", () => {
  const email = passwordResetEmail({ email: "meera@example.test", name: "Meera <Desai>", token: "tok_ABC123" }, "https://harsol27.example");

  it("links to our reset page with the token, in the text and the button", () => {
    expect(email.to).toBe("meera@example.test");
    expect(email.text).toContain("https://harsol27.example/reset-password?token=tok_ABC123");
    expect(email.html).toContain('href="https://harsol27.example/reset-password?token=tok_ABC123"');
  });

  it("escapes the name in HTML and keeps the token out of the idempotency key", () => {
    expect(email.html).toContain("Meera &lt;Desai&gt;");
    expect(email.html).not.toContain("<Desai>");
    expect(email.idempotencyKey).toMatch(/^password-reset:[0-9a-f]{32}$/);
    expect(email.idempotencyKey).not.toContain("tok_ABC123");
  });
});
