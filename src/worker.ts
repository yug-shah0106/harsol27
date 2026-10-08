/**
 * Background worker: a separate process from the web server. Sends queued emails, with retries.
 * Run with `pnpm worker` (development) or the `worker` service in deploy/compose.yml.
 * Needs NODE_OPTIONS=--conditions=react-server so `server-only` imports resolve to nothing.
 */
import { db } from "./server/db";
import { workerEnv } from "./server/env";
import { getBoss, QUEUES } from "./server/jobs";
import { logError, logInfo } from "./server/log";
import { registerWorkers } from "./server/workers";

async function main() {
  const config = workerEnv();
  const boss = await getBoss("worker");
  // Optional, for tests: WORKER_QUEUES=product-photo runs only those queues.
  const only = process.env.WORKER_QUEUES ? new Set(process.env.WORKER_QUEUES.split(",").map((q) => q.trim())) : undefined;
  await registerWorkers(
    boss,
    { email: { apiKey: config.RESEND_API_KEY, from: config.EMAIL_FROM }, teamAlertEmails: config.TEAM_ALERT_EMAILS, appUrl: config.BETTER_AUTH_URL },
    only,
  );
  logInfo("worker started", { queues: only ? [...only] : Object.values(QUEUES) });

  const shutdown = async (signal: string) => {
    logInfo("worker stopping", { signal });
    await boss.stop({ graceful: true, timeout: 20_000 });
    await db().$disconnect();
    process.exit(0);
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error: unknown) => {
  logError(error, { component: "worker" });
  process.exit(1);
});
