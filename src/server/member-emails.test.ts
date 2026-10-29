import { describe, expect, it } from "vitest";
import { memberLoginEmail, passwordResetEmail } from "./member-emails";

describe("password reset email", () => {
  const email = passwordResetEmail({ email: "meera@example.test", name: "Meera <Desai>", token: "tok_ABC123" }, "https://harsol27.example");

  it("links to our reset page with the token, in the text and the button", () => {
    expect(email.to).toBe("meera@example.test");
    expect(email.text).toContain("https://harsol27.example/staff/reset-password?token=tok_ABC123");
    expect(email.html).toContain('href="https://harsol27.example/staff/reset-password?token=tok_ABC123"');
  });

  it("escapes the name in HTML and keeps the token out of the idempotency key", () => {
    expect(email.html).toContain("Meera &lt;Desai&gt;");
    expect(email.html).not.toContain("<Desai>");
    expect(email.idempotencyKey).toMatch(/^password-reset:[0-9a-f]{32}$/);
    expect(email.idempotencyKey).not.toContain("tok_ABC123");
  });
});

describe("member login email", () => {
  const base = { userId: "u1", auditId: "a1", email: "jignesh@example.test", name: "Jignesh <Shah>", username: "jigneshshah", password: "Ab3dEf7hJk9m" };

  it("sends a seller their username, password and the seller sign-in, to their own address", () => {
    const email = memberLoginEmail({ ...base, kind: "created" }, "https://harsol27.example");
    expect(email.to).toBe("jignesh@example.test");
    expect(email.subject).toBe("Your Harsol27 seller login");
    expect(email.text).toContain("Sign in: https://harsol27.example/seller/sign-in");
    expect(email.text).toContain("Username: jigneshshah\nPassword: Ab3dEf7hJk9m");
    expect(email.html).toContain("Jignesh &lt;Shah&gt;");
    expect(email.idempotencyKey).toBe("member-login:a1"); // never the password
  });

  it("a buyer's new password points to the buyers' sign-in with their email; a linked account keeps its own password", () => {
    const reset = memberLoginEmail({ ...base, kind: "reset", username: null }, "https://harsol27.example");
    expect(reset.subject).toBe("Your new Harsol27 password");
    expect(reset.text).toContain("Sign in: https://harsol27.example/sign-in\nEmail: jignesh@example.test\nPassword: Ab3dEf7hJk9m");
    const linked = memberLoginEmail({ ...base, kind: "linked", password: null }, "https://harsol27.example");
    expect(linked.text).toContain("Password: the one you already use on Harsol27");
  });
});
