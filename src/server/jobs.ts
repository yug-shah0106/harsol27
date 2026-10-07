import "server-only";
import { fromPrisma, PgBoss } from "pg-boss";
import type { Prisma } from "@/generated/prisma/client";
import { baseEnv } from "./env";
import { logError } from "./log";

export const QUEUES = {
  leadConfirmation: "lead-confirmation",
  leadTeamAlert: "lead-team-alert",
  dataRetention: "data-retention",
} as const;

export type LeadJob = { leadId: string };

// Retries with exponential backoff, capped at one hour between attempts (about a day in total).
const QUEUE_OPTIONS = { retryLimit: 12, retryDelay: 30, retryBackoff: true, retryDelayMax: 3600 };

let boss: Promise<PgBoss> | undefined;

/**
 * The process-wide pg-boss instance. The web server only enqueues; the worker process also runs
 * maintenance and the scheduler. pg-boss keeps its tables in its own `pgboss` schema.
 */
export function getBoss(role: "web" | "worker" = "web"): Promise<PgBoss> {
  boss ??= (async () => {
    const instance = new PgBoss({
      connectionString: baseEnv().DATABASE_URL,
      max: role === "web" ? 2 : 5,
      supervise: role === "worker",
      schedule: role === "worker",
    });
    instance.on("error", (error) => logError(error, { component: "pg-boss" }));
    await instance.start();
    for (const name of Object.values(QUEUES)) await instance.createQueue(name, QUEUE_OPTIONS);
    return instance;
  })().catch((error: unknown) => {
    boss = undefined; // let the next call retry instead of caching the failure
    throw error;
  });
  return boss;
}

/**
 * Queue the two lead emails inside the caller's transaction: the lead and its email jobs are
 * committed together or not at all, so an email can never be lost and never fails the submission.
 */
export async function enqueueLeadEmails(instance: PgBoss, tx: Prisma.TransactionClient, leadId: string): Promise<void> {
  const db = fromPrisma(tx);
  await instance.send(QUEUES.leadConfirmation, { leadId } satisfies LeadJob, { db });
  await instance.send(QUEUES.leadTeamAlert, { leadId } satisfies LeadJob, { db });
}
