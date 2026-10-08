import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "./db";
import { getBoss, QUEUES } from "./jobs";
import { getOpsStatus, opsAlertEmail, recordHeartbeat } from "./ops";
import { registerWorkers } from "./workers";

const HOUR = 3_600_000;
const backup = (finishedAt: Date, ok = true, extra: { restoreChecked?: boolean; error?: string } = {}) =>
  db().backupRun.create({ data: { startedAt: finishedAt, finishedAt, ok, fileName: "x.dump", restoreChecked: extra.restoreChecked ?? ok, error: extra.error } });

beforeEach(async () => {
  await db().backupRun.deleteMany();
  await db().serviceHeartbeat.deleteMany();
});
afterAll(async () => {
  vi.unstubAllGlobals();
  await (await getBoss()).stop({ graceful: false });
  await db().$disconnect();
});

describe("getOpsStatus", () => {
  it("is all clear with a live worker and last night's backup", async () => {
    const now = new Date();
    await recordHeartbeat("worker", new Date(now.getTime() - 60_000));
    await backup(new Date(now.getTime() - 6 * HOUR));
    const status = await getOpsStatus(now);
    expect(status.urgent).toEqual([]);
    expect(status.lastBackup).toMatchObject({ restoreChecked: true });
  });

  it("raises the alarm when the worker stops or backups stop succeeding", async () => {
    const now = new Date();
    expect((await getOpsStatus(now)).urgent).toEqual([
      "The background worker has never checked in: emails, photos and reminders are not being processed.",
      "No database backup has succeeded yet.",
    ]);
    await recordHeartbeat("worker", new Date(now.getTime() - 10 * 60_000));
    await backup(new Date(now.getTime() - 30 * HOUR));
    await backup(new Date(now.getTime() - 2 * HOUR), false, { error: "pg_dump: connection refused" });
    const status = await getOpsStatus(now);
    expect(status.urgent).toEqual([
      "The background worker last checked in 10 minutes ago: emails, photos and reminders are waiting.",
      "The last successful database backup was 30 hours ago.",
    ]);
    expect(status.attention).toContain("The latest backup attempt failed: pg_dump: connection refused.");
  });

  it("reports jobs that failed after every retry", async () => {
    const boss = await getBoss();
    await boss.createQueue("ops-test", { retryLimit: 0 });
    const failedCount = async () => Number(/^(\d+) "ops-test"/.exec((await getOpsStatus()).attention.find((a) => a.includes('"ops-test"')) ?? "")?.[1] ?? 0);
    const before = await failedCount(); // earlier runs leave theirs in the test database
    const id = await boss.send("ops-test", {});
    const [job] = await boss.fetch("ops-test");
    expect(job?.id).toBe(id);
    await boss.fail("ops-test", id!, new Error("Resend was down"));
    expect(await failedCount()).toBe(before + 1);
  });
});

describe("opsAlertEmail", () => {
  it("stays silent on a good day and lists every problem otherwise, once per day", () => {
    expect(opsAlertEmail({ urgent: [], attention: [], lastBackup: null }, ["team@example.test"], "2026-10-09")).toBeNull();
    const email = opsAlertEmail({ urgent: ["Worker <down>"], attention: ["Backup failed"], lastBackup: null }, ["team@example.test"], "2026-10-09")!;
    expect(email.subject).toBe("Harsol27 needs attention: 2 problems");
    expect(email.text).toContain("- Worker <down>\n- Backup failed");
    expect(email.html).toContain("Worker &lt;down&gt;");
    expect(email.idempotencyKey).toBe("ops-check/2026-10-09");
  });
});

describe("the daily check", () => {
  it("emails the team through the job queue when something needs attention", async () => {
    const sent: { to: unknown; subject: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as { to: unknown; subject: string };
        sent.push({ to: body.to, subject: body.subject });
        return new Response('{"id":"x"}', { status: 200 });
      }),
    );
    const boss = await getBoss();
    await registerWorkers(boss, { email: { apiKey: "re_test", from: "Harsol27 <test@example.test>" }, teamAlertEmails: ["team@example.test"], appUrl: "https://h.test" }, new Set([QUEUES.opsCheck]));
    await boss.send(QUEUES.opsCheck, {}); // what the 09:15 schedule does; no backup exists, so there is a problem
    await expect.poll(() => sent.find((s) => s.subject.startsWith("Harsol27 needs attention")), { timeout: 15_000 }).toMatchObject({ to: ["team@example.test"] });
  }, 20_000);
});

