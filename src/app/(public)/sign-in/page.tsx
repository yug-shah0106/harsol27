import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/return-path";
import { getMember } from "@/server/authz";
import { env } from "@/server/env";
import { PhoneSignIn } from "./phone-sign-in";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const next = safeReturnPath((await searchParams).next);
  if (await getMember()) redirect(next);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground">For buyers and sellers. No password needed: we send a code to your phone.</p>
      </div>
      {env().SMS_PROVIDER === "console" && (
        <p className="rounded-lg border border-border bg-secondary p-3 text-sm">
          <strong>Test mode.</strong> Text messages are not being sent yet. The code is written to the server log.
        </p>
      )}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-8">
        <PhoneSignIn next={next} />
      </div>
    </div>
  );
}
