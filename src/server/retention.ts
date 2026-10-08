import { db } from "./db";
import { deleteObject } from "./storage";

/** Source IP and browser details are kept this long for abuse investigation, then erased. */
export const REQUEST_METADATA_RETENTION_DAYS = 30;

/**
 * Erases IP address and user agent from leads and inquiries older than the retention period.
 * The records themselves stay. Safe to run any number of times: already-erased rows are skipped.
 */
export async function purgeExpiredRequestMetadata(now = new Date()): Promise<{ leads: number; inquiries: number }> {
  const cutoff = new Date(now.getTime() - REQUEST_METADATA_RETENTION_DAYS * 86_400_000);
  const stale = { createdAt: { lt: cutoff }, OR: [{ sourceIp: { not: null } }, { userAgent: { not: null } }] };
  const erase = { sourceIp: null, userAgent: null };
  const [leads, inquiries] = await db().$transaction([
    db().lead.updateMany({ where: stale, data: erase }),
    db().inquiry.updateMany({ where: stale, data: erase }),
  ]);
  return { leads: leads.count, inquiries: inquiries.count };
}

/** One-time codes live 5 minutes; rows older than a day serve no purpose. */
export async function purgeStaleOtpChallenges(now = new Date()): Promise<number> {
  const { count } = await db().otpChallenge.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 86_400_000) } } });
  return count;
}

/**
 * Files uploaded but never attached to an application within a day: delete the file, then the row.
 * If the file delete fails the row stays, so the next run tries again.
 */
export async function purgeUnclaimedUploads(now = new Date()): Promise<number> {
  const stale = await db().upload.findMany({
    where: { claimedAt: null, createdAt: { lt: new Date(now.getTime() - 86_400_000) } },
    select: { key: true },
    take: 500,
  });
  let removed = 0;
  for (const { key } of stale) {
    await deleteObject(key);
    removed += (await db().upload.deleteMany({ where: { key, claimedAt: null } })).count;
  }
  return removed;
}
