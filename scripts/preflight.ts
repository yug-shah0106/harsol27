/**
 * Go-live check: run on the server before launch, and after any settings change.
 *   docker compose -f deploy/compose.yml run --rm tools tsx scripts/preflight.ts
 * Prints every check with ✓ / ! / ✗ and exits with 1 if anything blocks launch.
 * PREFLIGHT_URL overrides the address the site checks use (e.g. http://app:3000 on a test machine).
 * Needs NODE_OPTIONS=--conditions=react-server (set in the tools container).
 */
import { db } from "../src/server/db";
import { getOpsStatus } from "../src/server/ops";
import { configChecks, emailDomainCheck, hasDraftNotice, type Check } from "../src/server/preflight";
import { headObject } from "../src/server/storage";

async function liveChecks(appUrl: string): Promise<Check[]> {
  const checks: Check[] = [];
  const check = (ok: boolean, label: string, detail: string) => checks.push(ok ? { status: "pass", label } : { status: "fail", label, detail });
  const attempt = async (label: string, run: () => Promise<Check["detail"] | null>) => {
    try {
      const problem = await run();
      check(problem === null, label, problem ?? "");
    } catch (error) {
      check(false, label, error instanceof Error ? error.message : String(error));
    }
  };

  await attempt("An Admin staff account exists", async () =>
    (await db().user.count({ where: { role: "ADMIN", disabledAt: null } })) > 0 ? null : "Create one: tsx scripts/staff.ts create --role ADMIN …",
  );
  await attempt("Industries are set up", async () => ((await db().industry.count({ where: { isActive: true } })) > 0 ? null : "Run the seed or add them in Admin → Industries"));
  await attempt("The worker is running and backups are current", async () => {
    const { urgent } = await getOpsStatus();
    return urgent.length ? urgent.join(" ") : null;
  });
  await attempt("The latest backup was test-restored and copied off the server", async () => {
    const { lastBackup } = await getOpsStatus();
    if (!lastBackup) return "No successful backup yet";
    if (!lastBackup.restoreChecked) return "The latest backup was not test-restored";
    return lastBackup.offsite ? null : "The latest backup is only on this server";
  });
  await attempt("File storage answers", async () => {
    await headObject("preflight/check"); // "not found" is a fine answer; an error is not
    return null;
  });
  await attempt("The public site is healthy", async () => {
    const response = await fetch(`${appUrl}/api/health/full`, { signal: AbortSignal.timeout(10_000) });
    return response.ok ? null : `${appUrl}/api/health/full answered ${response.status}`;
  });
  await attempt("The public site sends its security headers", async () => {
    const headers = (await fetch(appUrl, { signal: AbortSignal.timeout(10_000) })).headers;
    const missing = ["strict-transport-security", "content-security-policy", "x-content-type-options"].filter((h) => !headers.get(h));
    return missing.length ? `Missing: ${missing.join(", ")}` : null;
  });
  const fromDomain = /@([^>\s]+)>?\s*$/.exec(process.env.EMAIL_FROM ?? "")?.[1];
  if (process.env.RESEND_API_KEY && fromDomain) {
    try {
      const response = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, signal: AbortSignal.timeout(10_000) });
      checks.push(emailDomainCheck(response.status, await response.json().catch(() => ({})), fromDomain));
    } catch (error) {
      check(false, "The email domain is verified (SPF and DKIM), so emails reach inboxes", `Could not reach Resend: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const page of ["terms", "privacy"]) {
    await attempt(`The ${page} page has been legally reviewed`, async () => {
      const html = await (await fetch(`${appUrl}/${page}`, { signal: AbortSignal.timeout(10_000) })).text();
      return hasDraftNotice(html) ? `/${page} still says "Draft": remove <DraftNotice /> after the legal review` : null;
    });
  }
  return checks;
}

async function main() {
  const appUrl = (process.env.PREFLIGHT_URL ?? process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "");
  console.log(`Harsol27 go-live check · ${appUrl || "(no APP_URL)"}\n`);
  const checks = [...configChecks(process.env), ...(await liveChecks(appUrl))];
  const mark = { pass: "✓", warn: "!", fail: "✗" } as const;
  for (const c of checks) console.log(`  ${mark[c.status]} ${c.label}${c.detail ? `\n      ${c.detail}` : ""}`);
  const count = (s: Check["status"]) => checks.filter((c) => c.status === s).length;
  console.log(`\n${count("pass")} passed, ${count("warn")} to look at, ${count("fail")} blocking launch.`);
  await db().$disconnect();
  process.exit(count("fail") ? 1 : 0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
