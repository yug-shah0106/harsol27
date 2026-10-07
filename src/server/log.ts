/** Logs an unexpected error as one JSON line and returns a short reference the user can quote. */
export function logError(error: unknown, context: Record<string, unknown> = {}): string {
  const ref = crypto.randomUUID().slice(0, 8);
  const err = error instanceof Error ? error : new Error(describe(error));
  console.error(
    JSON.stringify({ level: "error", ref, name: err.name, message: err.message, stack: err.stack, ...context }),
  );
  return ref;
}

/** Libraries sometimes emit plain objects as errors; keep their content instead of "[object Object]". */
function describe(value: unknown): string {
  if (typeof value !== "object" || value === null) return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

export function logInfo(message: string, context: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level: "info", message, ...context }));
}
