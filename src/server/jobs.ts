import "server-only";
import { fromPrisma, PgBoss } from "pg-boss";
import type { Prisma } from "@/generated/prisma/client";
import { baseEnv } from "./env";
import { logError } from "./log";

export const QUEUES = {
  leadConfirmation: "lead-confirmation",
  leadTeamAlert: "lead-team-alert",
  dataRetention: "data-retention",
  sellerApplicationAlert: "seller-application-alert",
  sellerDecision: "seller-decision",
  productPhoto: "product-photo",
  inquiryNotification: "inquiry-notification",
  subscriptionReminders: "subscription-reminders", // daily: finds the reminders due and queues one email each
  subscriptionReminderEmail: "subscription-reminder-email",
  subscriptionSummary: "subscription-summary", // weekly, to the team
  opsCheck: "ops-check", // daily: backups, worker, failed jobs → email the team if anything is wrong
  passwordResetEmail: "password-reset-email",
} as const;

export type LeadJob = { leadId: string };
/** Seller emails point at one status-history row, so each application or decision is emailed once. */
export type SellerChangeJob = { changeId: string };
export type PhotoJob = { photoId: string };
export type InquiryJob = { inquiryId: string };
/** Points at one SubscriptionReminder row, which exists once per seller, paid-until date and reminder. */
export type ReminderJob = { reminderId: string };
/** The reset token itself: Better Auth keeps only its row (which expires in an hour), so the job carries it. */
export type PasswordResetJob = { userId: string; token: string };

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

/** Queue a job inside the caller's transaction: committed together with the data it refers to. */
export async function enqueueInTransaction(instance: PgBoss, tx: Prisma.TransactionClient, queue: string, data: object): Promise<void> {
  await instance.send(queue, data, { db: fromPrisma(tx) });
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

/** Queue a password-reset email. Not in a transaction: the token row is already saved by Better Auth. */
export async function enqueuePasswordResetEmail(userId: string, token: string): Promise<void> {
  await (await getBoss()).send(QUEUES.passwordResetEmail, { userId, token } satisfies PasswordResetJob);
}
