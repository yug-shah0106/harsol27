import { describe, expect, it } from "vitest";
import { envSchema, withoutEmpty } from "./env";

const valid = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  BETTER_AUTH_URL: "https://example.ngrok.app",
  BETTER_AUTH_SECRET: "x".repeat(32),
  S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  S3_BUCKET: "harsol27-documents",
  S3_ACCESS_KEY_ID: "key",
  S3_SECRET_ACCESS_KEY: "secret",
};

describe("envSchema", () => {
  it("accepts a complete configuration and applies defaults", () => {
    const parsed = envSchema.parse(valid);
    expect(parsed.CLIENT_IP_HEADER).toBe("x-forwarded-for");
    expect(parsed.S3_REGION).toBe("auto");
  });

  it("rejects a short secret, a non-postgres URL and an unknown IP header", () => {
    expect(envSchema.safeParse({ ...valid, BETTER_AUTH_SECRET: "short" }).success).toBe(false);
    expect(envSchema.safeParse({ ...valid, DATABASE_URL: "mysql://u:p@h/db" }).success).toBe(false);
    expect(envSchema.safeParse({ ...valid, CLIENT_IP_HEADER: "x-client-ip" }).success).toBe(false);
    expect(envSchema.safeParse({ ...valid, SMS_PROVIDER: "twilio" }).success).toBe(false);
    expect(envSchema.safeParse({ ...valid, S3_BUCKET: "Bad_Bucket" }).success).toBe(false);
  });

  it("runs without SMS: sign-in by code is switched off", () => {
    expect(envSchema.parse({ ...valid, NODE_ENV: "production" }).SMS_PROVIDER).toBeUndefined();
  });

  it("refuses to log sign-in codes in production unless a staging server allows it explicitly", () => {
    const production = { ...valid, NODE_ENV: "production", SMS_PROVIDER: "console" };
    const refused = envSchema.safeParse(production);
    expect(refused.success).toBe(false);
    expect(refused.error?.issues[0]?.path).toEqual(["SMS_PROVIDER"]);
    expect(envSchema.safeParse({ ...production, ALLOW_CONSOLE_SMS: "true" }).success).toBe(true);
    expect(envSchema.safeParse({ ...valid, NODE_ENV: "development", SMS_PROVIDER: "console" }).success).toBe(true);
  });

  it("treats an empty optional setting (as Docker Compose passes it) as unset", () => {
    const fromCompose = { ...valid, GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", SMS_PROVIDER: "", S3_PUBLIC_ENDPOINT: "" };
    expect(envSchema.safeParse(fromCompose).success).toBe(false);
    expect(envSchema.safeParse(withoutEmpty(fromCompose)).success).toBe(true);
  });

  it("takes the Google sign-in key whole or not at all", () => {
    const google = { GOOGLE_CLIENT_ID: "123-abc.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "GOCSPX-secret" };
    expect(envSchema.safeParse({ ...valid, ...google }).success).toBe(true);
    expect(envSchema.safeParse({ ...valid, GOOGLE_CLIENT_ID: google.GOOGLE_CLIENT_ID }).success).toBe(false);
    expect(envSchema.safeParse({ ...valid, GOOGLE_CLIENT_SECRET: google.GOOGLE_CLIENT_SECRET }).success).toBe(false);
  });

  it("requires every secret to be present", () => {
    for (const key of Object.keys(valid)) {
      const rest = Object.fromEntries(Object.entries(valid).filter(([k]) => k !== key));
      expect(envSchema.safeParse(rest).success, key).toBe(false);
    }
  });
});
