import { expect, type Page } from "@playwright/test";

export const STAFF = {
  admin: { email: "e2e-admin@example.test", name: "E2E Admin", role: "ADMIN", passwordEnv: "E2E_ADMIN_PASSWORD" },
  viewer: { email: "e2e-viewer@example.test", name: "E2E Viewer", role: "VIEWER", passwordEnv: "E2E_VIEWER_PASSWORD" },
} as const;

export function passwordOf(staff: (typeof STAFF)[keyof typeof STAFF]): string {
  const value = process.env[staff.passwordEnv];
  if (!value) throw new Error(`${staff.passwordEnv} was not set by global setup`);
  return value;
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/staff/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function expectGenericError(page: Page) {
  await expect(page.locator("#sign-in-error")).toContainText(
    "Email or password is incorrect, or the account is temporarily locked.",
  );
}

/** Each test gets its own client IP so per-IP rate limits never leak between tests. */
export function uniqueIp(): string {
  const n = () => Math.floor(Math.random() * 254) + 1;
  return `10.${n()}.${n()}.${n()}`;
}
