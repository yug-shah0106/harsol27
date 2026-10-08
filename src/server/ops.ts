import { db } from "./db";
import { escapeHtml, type Email } from "./email";
import { emailLayout } from "./lead-emails";

// Is everything that runs in the background healthy? Used by /api/health/full (for an external
// uptime monitor) and by the worker's daily email to the team. Loaded by the worker too, so it must
// not import anything from Next.js (see workers.ts).

/** The worker checks in every minute; three missed minutes means it is down. */
export const HEARTBEAT_INTERVAL_MS = 60_000;
export const WORKER_STALE_MS = 3 * 60_000;
/** Backups run nightly; allow a couple of hours of slack before raising the alarm. */
export const BACKUP_MAX_AGE_HOURS = 26;

export function recordHeartbeat(name: string, now = new Date()) {
  return db().serviceHeartbeat.upsert({ where: { name }, create: { name, beatAt: now }, update: { beatAt: now } });
}

export type OpsStatus = {
  /** Problems that mean "something is down": they fail /api/health/full. */
  urgent: string[];
  /** Problems worth a look today, but not an outage (e.g. a failed email). */
  attention: string[];
  lastBackup: { at: Date; offsite: boolean; restoreChecked: boolean } | null;
};

const ago = (from: Date, now: Date) => {
  const minutes = Math.round((now.getTime() - from.getTime()) / 60_000);
  return minutes < 120 ? `${minutes} minutes ago` : `${Math.round(minutes / 60)} hours ago`;
};

export async function getOpsStatus(now = new Date()): Promise<OpsStatus> {
  const urgent: string[] = [];
  const attention: string[] = [];

  const worker = await db().serviceHeartbeat.findUnique({ where: { name: "worker" } });
  if (!worker) urgent.push("The background worker has never checked in: emails, photos and reminders are not being processed.");
  else if (now.getTime() - worker.beatAt.getTime() > WORKER_STALE_MS) {
    urgent.push(`The background worker last checked in ${ago(worker.beatAt, now)}: emails, photos and reminders are waiting.`);
  }

  const [lastGood, lastRun] = await Promise.all([
    db().backupRun.findFirst({ where: { ok: true }, orderBy: { finishedAt: "desc" } }),
    db().backupRun.findFirst({ orderBy: { finishedAt: "desc" } }),
  ]);
  if (!lastGood) urgent.push("No database backup has succeeded yet.");
  else if (now.getTime() - lastGood.finishedAt.getTime() > BACKUP_MAX_AGE_HOURS * 3_600_000) {
    urgent.push(`The last successful database backup was ${ago(lastGood.finishedAt, now)}.`);
  }
  if (lastRun && !lastRun.ok) attention.push(`The latest backup attempt failed: ${lastRun.error ?? "no details"}.`);
  if (lastGood && !lastGood.restoreChecked) attention.push("The latest backup could not be test-restored.");

  const failed = await db().$queryRaw<{ name: string; count: number }[]>`
    SELECT name, count(*)::int AS count FROM pgboss.job
    WHERE state = 'failed' AND completed_on > ${new Date(now.getTime() - 24 * 3_600_000)}
    GROUP BY name ORDER BY name`;
  for (const { name, count } of failed) attention.push(`${count} "${name}" ${count === 1 ? "job" : "jobs"} failed after every retry in the last 24 hours.`);

  return { urgent, attention, lastBackup: lastGood && { at: lastGood.finishedAt, offsite: lastGood.offsite, restoreChecked: lastGood.restoreChecked } };
}

/** To the team, daily: what needs attention. Null on a good day, so a quiet inbox means all is well. */
export function opsAlertEmail(status: OpsStatus, to: string[], day: string): Email | null {
  const problems = [...status.urgent, ...status.attention];
  if (!problems.length) return null;
  const footer = "Details are in the server logs (docker compose logs app worker backup). What to do: deploy/README.md.";
  return {
    to,
    subject: `Harsol27 needs attention: ${problems.length} ${problems.length === 1 ? "problem" : "problems"}`,
    text: ["The daily check found:", "", ...problems.map((p) => `- ${p}`), "", footer].join("\n"),
    html: emailLayout(`<p>The daily check found:</p><ul>${problems.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul><p>${escapeHtml(footer)}</p>`),
    idempotencyKey: `ops-check/${day}`,
  };
}
