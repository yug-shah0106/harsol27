import { db } from "./db";

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
