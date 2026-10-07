import { describe, expect, it } from "vitest";
import { envSchema } from "./env";

const valid = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  BETTER_AUTH_URL: "https://example.ngrok.app",
  BETTER_AUTH_SECRET: "x".repeat(32),
};

describe("envSchema", () => {
  it("accepts a complete configuration and applies defaults", () => {
    const parsed = envSchema.parse(valid);
    expect(parsed.CLIENT_IP_HEADER).toBe("x-forwarded-for");
  });

  it("rejects a short secret, a non-postgres URL and an unknown IP header", () => {
    expect(envSchema.safeParse({ ...valid, BETTER_AUTH_SECRET: "short" }).success).toBe(false);
    expect(envSchema.safeParse({ ...valid, DATABASE_URL: "mysql://u:p@h/db" }).success).toBe(false);
    expect(envSchema.safeParse({ ...valid, CLIENT_IP_HEADER: "x-client-ip" }).success).toBe(false);
  });

  it("requires every secret to be present", () => {
    for (const key of Object.keys(valid)) {
      const rest = Object.fromEntries(Object.entries(valid).filter(([k]) => k !== key));
      expect(envSchema.safeParse(rest).success, key).toBe(false);
    }
  });
});
