/**
 * Staff account management. There is no sign-up page for staff, by design.
 *
 *   pnpm staff create       --email a@b.com --name "Full Name" --role ADMIN|VIEWER
 *   pnpm staff set-password --email a@b.com      (also unlocks and signs out everywhere)
 *   pnpm staff disable      --email a@b.com      (blocks sign-in and signs out everywhere)
 *   pnpm staff enable       --email a@b.com
 *
 * The password is typed at a hidden prompt, or piped on stdin for automation. It is never
 * accepted as a command-line argument, where it would end up in shell history.
 */
import "dotenv/config";
import { stdin, stdout } from "node:process";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword, PASSWORD_MAX_LENGTH, STAFF_PASSWORD_MIN_LENGTH } from "../src/server/password";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
const passwordSchema = z
  .string()
  .min(STAFF_PASSWORD_MIN_LENGTH, `Password must be at least ${STAFF_PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`);

async function readPassword(): Promise<string> {
  if (!stdin.isTTY) {
    let input = "";
    for await (const chunk of stdin) input += chunk;
    return passwordSchema.parse(input.split(/\r?\n/)[0]);
  }
  const first = await promptHidden("Password: ");
  const second = await promptHidden("Repeat password: ");
  if (first !== second) throw new Error("Passwords do not match.");
  return passwordSchema.parse(first);
}

function promptHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    let value = "";
    const finish = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") return finish(), resolve(value);
        if (ch === "\u0003") return finish(), reject(new Error("Cancelled."));
        value = ch === "\u007f" || ch === "\b" ? value.slice(0, -1) : value + ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const [command] = process.argv.slice(2);
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: { email: { type: "string" }, name: { type: "string" }, role: { type: "string" } },
  });
  const email = emailSchema.parse(values.email);
  const url = z.string().min(1, "DATABASE_URL is not set.").parse(process.env.DATABASE_URL);
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    switch (command) {
      case "create": {
        const name = z.string().trim().min(1, "--name is required.").max(100).parse(values.name);
        const role = z.enum(["ADMIN", "VIEWER"]).parse(values.role);
        if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
          throw new Error(`An account with email ${email} already exists.`);
        }
        const passwordHash = await hashPassword(await readPassword());
        await db.$transaction(async (tx) => {
          const user = await tx.user.create({ data: { email, name, role, emailVerified: true } });
          // Better Auth's email/password provider looks for exactly this "credential" account row.
          await tx.account.create({ data: { userId: user.id, accountId: user.id, providerId: "credential", password: passwordHash } });
        });
        console.log(`Created ${role} account for ${email}.`);
        break;
      }
      case "set-password": {
        const user = await findStaff(db, email);
        const passwordHash = await hashPassword(await readPassword());
        await db.$transaction([
          db.account.updateMany({ where: { userId: user.id, providerId: "credential" }, data: { password: passwordHash } }),
          db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } }),
          db.session.deleteMany({ where: { userId: user.id } }),
        ]);
        console.log(`Password updated for ${email}; all of their sessions were signed out.`);
        break;
      }
      case "disable": {
        const user = await findStaff(db, email);
        await db.$transaction([
          db.user.update({ where: { id: user.id }, data: { disabledAt: new Date() } }),
          db.session.deleteMany({ where: { userId: user.id } }),
        ]);
        console.log(`Disabled ${email} and signed them out everywhere.`);
        break;
      }
      case "enable": {
        const user = await findStaff(db, email);
        await db.user.update({ where: { id: user.id }, data: { disabledAt: null, failedLoginCount: 0, lockedUntil: null } });
        console.log(`Enabled ${email}.`);
        break;
      }
      default:
        throw new Error("Usage: pnpm staff <create|set-password|disable|enable> --email <email> [--name <name> --role ADMIN|VIEWER]");
    }
  } finally {
    await db.$disconnect();
  }
}

async function findStaff(db: PrismaClient, email: string) {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!user || user.role === "MEMBER") throw new Error(`No staff account with email ${email}.`);
  return user;
}

main().catch((error: unknown) => {
  console.error(error instanceof z.ZodError ? error.issues.map((i) => i.message).join("\n") : (error as Error).message);
  process.exit(1);
});
