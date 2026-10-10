import "server-only";
import { z } from "zod";

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /** Public origin of the site, e.g. https://example.ngrok.app. Used for cookies, origin checks and links in emails. */
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
});

/** S3-compatible object storage: Cloudflare R2 in production, a local SeaweedFS in development. */
const storageSchema = z.object({
  /** Endpoint the server uses, e.g. https://<account>.r2.cloudflarestorage.com */
  S3_ENDPOINT: z.url({ protocol: /^https?$/ }),
  /** Endpoint browsers upload to, when it differs (e.g. inside Docker). Defaults to S3_ENDPOINT. */
  S3_PUBLIC_ENDPOINT: z.url({ protocol: /^https?$/ }).optional(),
  S3_REGION: z.string().min(1).default("auto"),
  S3_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/, "must be a valid bucket name"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
});

/** What the web server needs. */
const schema = baseSchema.extend(storageSchema.shape).extend({
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  /**
   * Header our nearest trusted proxy writes the client IP into.
   * "x-forwarded-for" (ngrok, Caddy) → the right-most entry is used, because that is the one our proxy appended.
   * "cf-connecting-ip" once the site is behind Cloudflare.
   */
  CLIENT_IP_HEADER: z.enum(["x-forwarded-for", "cf-connecting-ip", "x-real-ip"]).default("x-forwarded-for"),
  /**
   * How one-time codes would be delivered. Sign-in by SMS code is switched off (members use email and
   * password) and kept for later (docs/FUTURE.md), so leave this unset. "console" writes codes to the
   * server log: development and staging only, never with real users.
   */
  SMS_PROVIDER: z.enum(["console"]).optional(),
  /** Staging only: lets a production build run with the console sender. Never set at launch. */
  ALLOW_CONSOLE_SMS: z.enum(["true", "false"]).default("false"),
  /**
   * "Continue with Google" (optional). Both or neither: the button appears only when both are set.
   * From Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application),
   * with the redirect URI <BETTER_AUTH_URL>/api/auth/callback/google.
   */
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
}).superRefine((config, ctx) => {
  if (!config.GOOGLE_CLIENT_ID !== !config.GOOGLE_CLIENT_SECRET) {
    ctx.addIssue({ code: "custom", path: ["GOOGLE_CLIENT_ID"], message: "set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither" });
  }
  // Anyone who can read the server log could sign in as anyone: refuse unless explicitly allowed.
  if (config.NODE_ENV === "production" && config.SMS_PROVIDER === "console" && config.ALLOW_CONSOLE_SMS !== "true") {
    ctx.addIssue({
      code: "custom",
      path: ["SMS_PROVIDER"],
      message: '"console" writes sign-in codes to the server log. Connect an SMS provider, or set ALLOW_CONSOLE_SMS=true on a staging server only.',
    });
  }
});

/** What the background worker needs: it sends email, so it gets the email settings and no auth secret. */
const workerSchema = baseSchema.extend(storageSchema.shape).extend({
  RESEND_API_KEY: z.string().startsWith("re_", "must be a Resend API key (starts with re_)"),
  /** e.g. "Harsol27 <hello@harsol27.com>". Must be on a domain verified in Resend. */
  EMAIL_FROM: z.string().min(3),
  /** Comma-separated staff addresses that receive new-lead alerts. */
  TEAM_ALERT_EMAILS: z
    .string()
    .transform((v) => v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))
    .pipe(z.array(z.email()).min(1, "list at least one address")),
});

export type Env = z.infer<typeof schema>;
export type WorkerEnv = z.infer<typeof workerSchema>;

/** Docker Compose passes an unset optional setting as "" (e.g. `${GOOGLE_CLIENT_ID:-}`): treat it as unset. */
export function withoutEmpty(values: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== ""));
}

function parse<T extends z.ZodType>(s: T): z.infer<T> {
  const parsed = s.safeParse(withoutEmpty(process.env));
  if (!parsed.success) {
    // Only variable names and rule messages are printed, never values.
    const problems = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return parsed.data;
}

let cachedBase: z.infer<typeof baseSchema> | undefined;
let cachedStorage: z.infer<typeof storageSchema> | undefined;
let cached: Env | undefined;
let cachedWorker: WorkerEnv | undefined;

/** Only the settings shared by the web server and the worker (database, public URL). */
export function baseEnv(): z.infer<typeof baseSchema> {
  cachedBase ??= parse(baseSchema);
  return cachedBase;
}

/** Storage settings only: used by both the web server and the worker. */
export function storageEnv(): z.infer<typeof storageSchema> {
  cachedStorage ??= parse(storageSchema);
  return cachedStorage;
}

/** Validated environment. Called once at server start (instrumentation.ts) so a bad config fails fast. */
export function env(): Env {
  cached ??= parse(schema);
  return cached;
}

/** Validated worker environment. Called once when the worker starts. */
export function workerEnv(): WorkerEnv {
  cachedWorker ??= parse(workerSchema);
  return cachedWorker;
}

export { schema as envSchema, workerSchema as workerEnvSchema };
