import "server-only";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /** Public origin of the site, e.g. https://example.ngrok.app. Used for cookies and origin checks. */
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  /**
   * Header our nearest trusted proxy writes the client IP into.
   * "x-forwarded-for" (ngrok, Caddy) → the right-most entry is used, because that is the one our proxy appended.
   * "cf-connecting-ip" once the site is behind Cloudflare.
   */
  CLIENT_IP_HEADER: z.enum(["x-forwarded-for", "cf-connecting-ip", "x-real-ip"]).default("x-forwarded-for"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated environment. Called once at server start (instrumentation.ts) so a bad config fails fast. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Only variable names and rule messages are printed, never values.
    const problems = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  cached = parsed.data;
  return cached;
}

export { schema as envSchema };
