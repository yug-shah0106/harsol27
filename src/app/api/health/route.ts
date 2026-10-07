import { db } from "@/server/db";
import { logError } from "@/server/errors";

export const dynamic = "force-dynamic";

/** Liveness + database check for Docker and uptime monitors. Reveals nothing beyond up/down. */
export async function GET(): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  try {
    await db().$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers });
  } catch (error) {
    logError(error, { route: "health" });
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
