import type { Job, JobResult, PgBoss } from "pg-boss";
import { db } from "./db";
import { sendEmail, type Email, type EmailConfig } from "./email";
import { QUEUES, type InquiryJob, type LeadJob, type PhotoJob, type SellerChangeJob } from "./jobs";
import { leadConfirmationEmail, leadTeamAlertEmail, type LeadForEmail } from "./lead-emails";
import { logError, logInfo } from "./log";
import { purgeExpiredRequestMetadata, purgeStaleOtpChallenges, purgeUnclaimedUploads } from "./retention";
import { processPhoto } from "./photo-processing";
import {
  newInquiryEmail,
  sellerApplicationAlertEmail,
  sellerDecisionEmail,
  type InquiryForEmail,
  type SellerChangeForEmail,
} from "./seller-emails";

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

/** Server-side only: the seller's own contact address, to email them (allowed by the contact guard). */
function loadInquiry({ inquiryId }: InquiryJob): Promise<InquiryForEmail | null> {
  return db().inquiry.findUnique({
    where: { id: inquiryId },
    select: {
      id: true,
      buyerName: true,
      buyerPhone: true,
      message: true,
      product: { select: { name: true } },
      seller: { select: { companyName: true, contactName: true, contactEmail: true } },
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

/**
 * Attaches a handler to every queue (or only to `only`, e.g. in end-to-end tests that must not send
 * email). A failed job is retried by pg-boss with backoff.
 */
export async function registerWorkers(boss: PgBoss, config: WorkerConfig, only?: ReadonlySet<string>): Promise<void> {
  const { teamAlertEmails: team, appUrl } = config;
  const wanted = (queue: string) => !only || only.has(queue);
  if (wanted(QUEUES.leadConfirmation)) await boss.work<LeadJob>(QUEUES.leadConfirmation, WORK_OPTIONS, emailHandler(config, loadLead, leadConfirmationEmail));
  if (wanted(QUEUES.leadTeamAlert)) await boss.work<LeadJob>(QUEUES.leadTeamAlert, WORK_OPTIONS, emailHandler(config, loadLead, (lead) => leadTeamAlertEmail(lead, team, appUrl)));
  if (wanted(QUEUES.sellerApplicationAlert)) await boss.work<SellerChangeJob>(QUEUES.sellerApplicationAlert,
    WORK_OPTIONS,
    emailHandler(config, loadSellerChange, (change) => sellerApplicationAlertEmail(change, team, appUrl)),
  );
  if (wanted(QUEUES.sellerDecision)) await boss.work<SellerChangeJob>(QUEUES.sellerDecision,
    WORK_OPTIONS,
    emailHandler(config, loadSellerChange, (change) => sellerDecisionEmail(change, appUrl)),
  );

  if (wanted(QUEUES.inquiryNotification)) await boss.work<InquiryJob>(QUEUES.inquiryNotification, WORK_OPTIONS, emailHandler(config, loadInquiry, (inquiry) => newInquiryEmail(inquiry, appUrl)));

  // Photos are processed one batch of 2 at a time per worker: resizing is CPU- and memory-heavy.
  if (wanted(QUEUES.productPhoto)) await boss.work<PhotoJob>(QUEUES.productPhoto, { batchSize: 2, perJobResults: true }, async (jobs) =>
    Promise.all(
      jobs.map(async (job): Promise<JobResult> => {
        try {
          return { id: job.id, status: "completed", output: { result: await processPhoto(job.data.photoId) } };
        } catch (error) {
          logError(error, { queue: job.name, jobId: job.id, retry: job.retryCount });
          return { id: job.id, status: "failed", output: { message: error instanceof Error ? error.message : String(error) } };
        }
      }),
    ),
  );

  // Nightly at 03:15 India time. Every step is idempotent, so a missed or repeated run is harmless.
  if (wanted(QUEUES.dataRetention)) await boss.schedule(QUEUES.dataRetention, "15 3 * * *", null, { tz: "Asia/Kolkata" });
  if (wanted(QUEUES.dataRetention)) await boss.work(QUEUES.dataRetention, async () => {
    logInfo("retention run", {
      requestMetadata: await purgeExpiredRequestMetadata(),
      otpChallenges: await purgeStaleOtpChallenges(),
      unclaimedUploads: await purgeUnclaimedUploads(),
    });
  });
}
