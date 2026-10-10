import { hash, verify } from "@node-rs/argon2";

// argon2id with the OWASP-recommended baseline (19 MiB, 2 passes, 1 lane).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const STAFF_PASSWORD_MIN_LENGTH = 12; // enforced by `pnpm staff`; staff cannot reset by email
export const MEMBER_PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword({ hash: digest, password }: { hash: string; password: string }): Promise<boolean> {
  try {
    return await verify(digest, password);
  } catch {
    return false; // malformed hash in the database must read as "wrong password", not crash sign-in
  }
}
