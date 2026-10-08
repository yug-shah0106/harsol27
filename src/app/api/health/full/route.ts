import { logError, logInfo } from "@/server/log";
import { getOpsStatus } from "@/server/ops";

export const dynamic = "force-dynamic";

/**
 * For an external uptime monitor: OK only when the database answers, the background worker is
 * running and last night's backup succeeded. Says nothing more to the public; the reasons go to
 * the server log (and the team's daily email).
 */
export async function GET(): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  try {
    const { urgent } = await getOpsStatus();
    if (urgent.length === 0) return Response.json({ status: "ok" }, { headers });
    logInfo("health check: degraded", { problems: urgent });
    return Response.json({ status: "degraded" }, { status: 503, headers });
  } catch (error) {
    logError(error, { route: "health/full" });
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
