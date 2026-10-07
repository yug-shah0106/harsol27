import { unstable_rethrow } from "next/navigation";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string> };

/** An error whose message is written for the end user and is safe to show. */
export class UserFacingError extends Error {
  constructor(
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "UserFacingError";
  }
}

/** Logs an unexpected error as one JSON line and returns a short reference the user can quote. */
export function logError(error: unknown, context: Record<string, unknown> = {}): string {
  const ref = crypto.randomUUID().slice(0, 8);
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({ level: "error", ref, name: err.name, message: err.message, stack: err.stack, ...context }),
  );
  return ref;
}

/**
 * The single error boundary for server actions. Known user-facing errors pass through;
 * everything else is logged server-side and replaced with a generic message, so stack traces
 * and database errors never reach the browser. Next.js control flow (redirect, notFound) is rethrown.
 */
export async function runAction<T>(name: string, fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof UserFacingError) return { ok: false, error: error.message, fields: error.fields };
    const ref = logError(error, { action: name });
    return { ok: false, error: `Something went wrong on our side. Please try again. (Reference ${ref})` };
  }
}
