/** Runs once when the server starts: refuse to boot with a missing or invalid environment. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env } = await import("./server/env");
    try {
      env();
    } catch (error) {
      // Next.js would otherwise keep running and answer every request with an error.
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
}
