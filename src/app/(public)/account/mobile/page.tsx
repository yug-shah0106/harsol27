import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { safeReturnPath } from "@/lib/return-path";
import { ADD_MOBILE_PATH, requireMember } from "@/server/authz";
import { MobileForm } from "../../sign-in/forms";

export const metadata: Metadata = { title: "Your mobile number", robots: { index: false } };

/**
 * Asks for the mobile number sellers get with inquiries. Every Google sign-in passes through here
 * (with ?next=) and moves straight on when there is one; ?change=1 (from the account page) edits it.
 */
export default async function MobilePage({ searchParams }: PageProps<"/account/mobile">) {
  const params = await searchParams;
  const member = await requireMember(ADD_MOBILE_PATH, { phoneOptional: true });
  const next = safeReturnPath(params.next);
  if (member.phone && params.change !== "1") redirect(next);

  return (
    <AuthCard
      title={member.phone ? "Change your mobile number" : "Add your mobile number"}
      description="Sellers you send inquiries to get this number, so they can call you back."
    >
      <MobileForm next={next} current={member.phone ?? ""} />
    </AuthCard>
  );
}
