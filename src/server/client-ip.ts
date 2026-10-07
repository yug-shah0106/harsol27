import { isIP } from "node:net";

/**
 * Client IP from the header our own proxy controls. For x-forwarded-for the right-most entry is
 * the one our proxy appended; anything to its left was supplied by the client and can be forged.
 * Returns null when the header is missing or malformed, so callers never store junk as an IP.
 */
export function clientIpFrom(headers: Headers, headerName: string): string | null {
  const raw = headers.get(headerName);
  if (!raw) return null;
  const candidate = (headerName === "x-forwarded-for" ? raw.split(",").at(-1) : raw)?.trim() ?? "";
  return isIP(candidate) ? candidate : null;
}
