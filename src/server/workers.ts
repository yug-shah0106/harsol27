import type { Job, JobResult, PgBoss } from "pg-boss";
import { db } from "./db";
import { sendEmail, type Email, type EmailConfig } from "./email";
import { QUEUES, type LeadJob } from "./jobs";
import { leadConfirmationEmail, leadTeamAlertEmail, type LeadForEmail } from "./lead-emails";
import { logError, logInfo } from "./log";
import { purgeExpiredRequestMetadata } from "./retention";

export type WorkerConfig = { email: EmailConfig; teamAlertEmails: string[]; appUrl: string };

// Batches let pg-boss fetch again immediately while the queue is full (with a batch of 1 it waits a
// polling interval between jobs). Results are reported per job: one failed email is retried on its
// own and never makes the others in its batch send again.
const WORK_OPTIONS = { batchSize: 10, perJobResults: true } as const;

async function loadLead(leadId: string): Promise<LeadForEmail | null> {
  const lead = await db().lead.findUnique({ where: { id: leadId }, include: { industry: { select: { name: true } } } });
  return lead && { ...lead, industryName: lead.industry.name };
}

function leadEmailHandler(config: WorkerConfig, build: (lead: LeadForEmail) => Email) {
  return async (jobs: Job<LeadJob>[]): Promise<JobResult[]> =>
    Promise.all(
      jobs.map(async (job): Promise<JobResult> => {
        try {
          const lead = await loadLead(job.data.leadId);
          if (lead) await sendEmail(config.email, build(lead)); // a deleted lead needs no email
          return { id: job.id, status: "completed" };
        } catch (error) {
          logError(error, { queue: job.name, jobId: job.id, retry: job.retryCount });
          return { id: job.id, status: "failed", output: { message: error instanceof Error ? error.message : String(error) } };
        }
      }),
    );
}

/** Attaches a handler to every queue. A failed job is retried by pg-boss with backoff. */
export async function registerWorkers(boss: PgBoss, config: WorkerConfig): Promise<void> {
  await boss.work<LeadJob>(QUEUES.leadConfirmation, WORK_OPTIONS, leadEmailHandler(config, leadConfirmationEmail));
  await boss.work<LeadJob>(
    QUEUES.leadTeamAlert,
    WORK_OPTIONS,
    leadEmailHandler(config, (lead) => leadTeamAlertEmail(lead, config.teamAlertEmails, config.appUrl)),
  );

  // Nightly at 03:15 India time. Idempotent, so a missed or repeated run is harmless.
  await boss.schedule(QUEUES.dataRetention, "15 3 * * *", null, { tz: "Asia/Kolkata" });
  await boss.work(QUEUES.dataRetention, async () => {
    logInfo("request metadata purged", await purgeExpiredRequestMetadata());
  });
}
