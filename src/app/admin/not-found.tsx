import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not found" };

/** A lead, seller or product that no longer exists, inside the admin area's own layout. */
export default function AdminNotFound() {
  return (
    <div className="flex max-w-xl flex-col items-start gap-4">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="text-muted-foreground">This record does not exist, or it was deleted.</p>
      <Button asChild>
        <Link href="/admin">Back to the overview</Link>
      </Button>
    </div>
  );
}
