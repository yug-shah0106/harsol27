import type { Job, JobResult, PgBoss } from "pg-boss";
// Worker code: never import modules that pull in Next.js (e.g. errors.ts → next/navigation); they
// cannot load in the worker process.
import { db } from "./db";
import { sendEmail, type Email, type EmailConfig } from "./email";
import { addDays, daysUntil, dueReminder, EXPIRED_NOTICE_LATEST_DAYS, EXPIRING_SOON_DAYS, REMINDER_DAYS } from "@/lib/subscription";
import { enqueueInTransaction, getBoss, QUEUES, type InquiryJob, type LeadJob, type PhotoJob, type ReminderJob, type SellerChangeJob } from "./jobs";
import { leadConfirmationEmail, leadTeamAlertEmail, type LeadForEmail } from "./lead-emails";
import { logError, logInfo } from "./log";
import { purgeExpiredRequestMetadata, purgeStaleOtpChallenges, purgeUnclaimedUploads } from "./retention";
import { processPhoto } from "./photo-processing";
import {
  newInquiryEmail,
  sellerApplicationAlertEmail,
  sellerDecisionEmail,
  subscriptionReminderEmail,
  subscriptionSummaryEmail,
  type InquiryForEmail,
  type ReminderForEmail,
  type SellerChangeForEmail,
  type SubscriptionSummary,
} from "./seller-emails";
import { indiaToday } from "./visibility";

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

/**
 * Daily: for every approved seller, the one reminder due today (see dueReminder) gets a row and an
 * email job, in one transaction. The row is unique per seller, paid-until date and reminder, so
 * running this twice, or after a renewal, never sends the same reminder twice.
 */
export async function queueDueReminders(now = new Date()): Promise<number> {
  const today = indiaToday(now);
  const sellers = await db().seller.findMany({
    where: { status: "APPROVED", paidUntil: { gte: addDays(today, -EXPIRED_NOTICE_LATEST_DAYS), lte: addDays(today, Math.max(...REMINDER_DAYS)) } },
    select: { id: true, paidUntil: true },
  });
  const due = sellers.flatMap(({ id, paidUntil }) => {
    const daysBefore = paidUntil && dueReminder(daysUntil(paidUntil, today));
    return paidUntil && daysBefore !== null ? [{ sellerId: id, paidUntil, daysBefore }] : [];
  });
  if (!due.length) return 0;

  const boss = await getBoss();
  return db().$transaction(async (tx) => {
    const created = await tx.subscriptionReminder.createManyAndReturn({ data: due, skipDuplicates: true, select: { id: true } });
    for (const { id } of created) await enqueueInTransaction(boss, tx, QUEUES.subscriptionReminderEmail, { reminderId: id } satisfies ReminderJob);
    return created.length;
  });
}

/**
 * A reminder whose seller has renewed or been suspended since it was queued is not sent: it would
 * be about a date that no longer applies.
 */
async function loadReminder({ reminderId }: ReminderJob): Promise<ReminderForEmail | null> {
  const reminder = await db().subscriptionReminder.findUnique({
    where: { id: reminderId },
    select: {
      id: true,
      paidUntil: true,
      daysBefore: true,
      seller: { select: { companyName: true, contactName: true, contactEmail: true, status: true, paidUntil: true } },
    },
  });
  if (!reminder || reminder.seller.status !== "APPROVED" || reminder.seller.paidUntil?.getTime() !== reminder.paidUntil.getTime()) return null;
  return reminder;
}

/** The team's weekly call list: approved sellers expiring soon or recently expired, with phone numbers. */
async function loadSubscriptionSummary(): Promise<SubscriptionSummary> {
  const today = indiaToday();
  const select = { id: true, companyName: true, contactName: true, contactPhone: true, city: true, paidUntil: true } as const;
  const [expiring, expired] = await Promise.all([
    db().seller.findMany({ where: { status: "APPROVED", paidUntil: { gte: today, lte: addDays(today, EXPIRING_SOON_DAYS) } }, orderBy: { paidUntil: "asc" }, take: 300, select }),
    db().seller.findMany({ where: { status: "APPROVED", paidUntil: { gte: addDays(today, -EXPIRING_SOON_DAYS), lt: today } }, orderBy: { paidUntil: "desc" }, take: 300, select }),
  ]);
  return { today, expiring, expired };
}

/**
 * Loads the record a job points at and sends the email built from it (then calls `sent`, if given).
 * A deleted record needs no email.
 */
function emailHandler<T extends object, R>(
  config: WorkerConfig,
  load: (data: T) => Promise<R | null>,
  build: (record: R) => Email | null,
  sent?: (record: R) => Promise<unknown>,
) {
  return async (jobs: Job<T>[]): Promise<JobResult[]> =>
    Promise.all(
      jobs.map(async (job): Promise<JobResult> => {
        try {
          const record = await load(job.data);
          const email = record && build(record);
          if (record && email) {
            await sendEmail(config.email, email);
            await sent?.(record);
          }
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

  if (wanted(QUEUES.subscriptionReminderEmail)) await boss.work<ReminderJob>(QUEUES.subscriptionReminderEmail,
    WORK_OPTIONS,
    emailHandler(
      config,
      loadReminder,
      (reminder) => subscriptionReminderEmail(reminder, team, appUrl, indiaToday()),
      (reminder) => db().subscriptionReminder.update({ where: { id: reminder.id }, data: { sentAt: new Date() } }),
    ),
  );

  // Daily at 09:00 India time: queue the reminders due today. Safe to repeat (see queueDueReminders).
  if (wanted(QUEUES.subscriptionReminders)) {
    await boss.schedule(QUEUES.subscriptionReminders, "0 9 * * *", {}, { tz: "Asia/Kolkata" });
    await boss.work(QUEUES.subscriptionReminders, async () => logInfo("subscription reminders queued", { count: await queueDueReminders() }));
  }

  // Mondays at 09:30 India time, to the team. The email's key includes the date, so it goes once a day at most.
  if (wanted(QUEUES.subscriptionSummary)) {
    await boss.schedule(QUEUES.subscriptionSummary, "30 9 * * 1", {}, { tz: "Asia/Kolkata" });
    await boss.work<object>(QUEUES.subscriptionSummary, WORK_OPTIONS, emailHandler(config, loadSubscriptionSummary, (summary) => subscriptionSummaryEmail(summary, team, appUrl)));
  }

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
