/** Only same-site paths: "/seller" yes; "//evil.example", "https://…" and "/\\evil" no. */
export function safeReturnPath(value: unknown, fallback = "/account"): string {
  return typeof value === "string" && /^\/(?![/\\])[\w\-./?=&%]*$/.test(value) ? value : fallback;
}
