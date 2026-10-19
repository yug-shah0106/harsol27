import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Toran } from "@/components/festive";
import { Wordmark } from "@/components/site-header";
import { getStaff } from "@/server/authz";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Staff sign in · Harsol27", robots: { index: false } };

export default async function StaffSignInPage() {
  if (await getStaff()) redirect("/admin");

  return (
    <>
      <Toran />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Wordmark />
          <h1 className="font-display text-4xl tracking-tight text-primary">Staff sign in</h1>
          <p className="text-sm text-muted-foreground">For the Harsol27 team.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/10">
          <SignInForm />
        </div>
      </main>
    </>
  );
}
