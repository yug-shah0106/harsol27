import type { Job, JobResult, PgBoss } from "pg-boss";
import { db } from "./db";
import { sendEmail, type Email, type EmailConfig } from "./email";
import { QUEUES, type LeadJob, type SellerChangeJob } from "./jobs";
import { leadConfirmationEmail, leadTeamAlertEmail, type LeadForEmail } from "./lead-emails";
import { logError, logInfo } from "./log";
import { purgeExpiredRequestMetadata, purgeStaleOtpChallenges, purgeUnclaimedUploads } from "./retention";
import { sellerApplicationAlertEmail, sellerDecisionEmail, type SellerChangeForEmail } from "./seller-emails";

export type WorkerConfig = { email: EmailConfig; teamAlertEmails: string[]; appUrl: string };

// Batches let pg-boss fetch again immediately while the queue is full (with a batch of 1 it waits a
// polling interval between jobs). Results are reported per job: one failed email is retried on its
// own and never makes the others in its batch send again.
const WORK_OPTIONS = { batchSize: 10, perJobResults: true } as const;

async function loadLead({ leadId }: LeadJob): Promise<LeadForEmail | null> {
  const lead = await db().lead.findUnique({ where: { id: leadId }, include: { industry: { select: { name: true } } } });
  return lead && { ...lead, industryName: lead.industry.name };
}

function loadSellerChange({ changeId }: SellerChangeJob): Promise<SellerChangeForEmail | null> {
  return db().sellerStatusChange.findUnique({
    where: { id: changeId },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      reason: true,
      seller: { select: { id: true, companyName: true, contactName: true, contactEmail: true, city: true, state: true } },
    },
  });
}

/** Loads the record a job points at and sends the email built from it. A deleted record needs no email. */
function emailHandler<T extends object, R>(config: WorkerConfig, load: (data: T) => Promise<R | null>, build: (record: R) => Email | null) {
  return async (jobs: Job<T>[]): Promise<JobResult[]> =>
    Promise.all(
      jobs.map(async (job): Promise<JobResult> => {
        try {
          const record = await load(job.data);
          const email = record && build(record);
          if (email) await sendEmail(config.email, email);
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
  const { teamAlertEmails: team, appUrl } = config;
  await boss.work<LeadJob>(QUEUES.leadConfirmation, WORK_OPTIONS, emailHandler(config, loadLead, leadConfirmationEmail));
  await boss.work<LeadJob>(QUEUES.leadTeamAlert, WORK_OPTIONS, emailHandler(config, loadLead, (lead) => leadTeamAlertEmail(lead, team, appUrl)));
  await boss.work<SellerChangeJob>(
    QUEUES.sellerApplicationAlert,
    WORK_OPTIONS,
    emailHandler(config, loadSellerChange, (change) => sellerApplicationAlertEmail(change, team, appUrl)),
  );
  await boss.work<SellerChangeJob>(
    QUEUES.sellerDecision,
    WORK_OPTIONS,
    emailHandler(config, loadSellerChange, (change) => sellerDecisionEmail(change, appUrl)),
  );

  // Nightly at 03:15 India time. Every step is idempotent, so a missed or repeated run is harmless.
  await boss.schedule(QUEUES.dataRetention, "15 3 * * *", null, { tz: "Asia/Kolkata" });
  await boss.work(QUEUES.dataRetention, async () => {
    logInfo("retention run", {
      requestMetadata: await purgeExpiredRequestMetadata(),
      otpChallenges: await purgeStaleOtpChallenges(),
      unclaimedUploads: await purgeUnclaimedUploads(),
    });
  });
}
