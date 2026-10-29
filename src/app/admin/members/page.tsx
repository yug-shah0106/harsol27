import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStaff, SELLER_SIGN_IN_PATH } from "@/server/authz";
import { baseEnv } from "@/server/env";
import { listMembers, memberListParamsSchema, openPassword, type MemberListParams } from "@/server/member-logins";
import { formatIst } from "../leads/format";
import { ResetMemberPassword } from "./reset-password";

export const metadata: Metadata = { title: "Members" };

function pageHref(params: MemberListParams, page: number): string {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `/admin/members?${s}` : "/admin/members";
}

/**
 * Every member login: buyers who made their own account, and the seller logins made from registrations.
 * Members can't reset their own password, so this is where admins make a new one for a buyer (a seller's can
 * also be reset from their registration). The password an admin made stays visible to admins only.
 */
export default async function MembersPage({ searchParams }: PageProps<"/admin/members">) {
  const staff = await requireStaff();
  const isAdmin = staff.role === "ADMIN";
  const params = memberListParamsSchema.parse(await searchParams);
  const { items, total, pageCount } = await listMembers(params);
  const site = baseEnv().BETTER_AUTH_URL;
  // What to send on WhatsApp: sellers sign in with their username on the seller page, buyers with their email.
  const signInText = (member: (typeof items)[number], password: string) =>
    member.username
      ? `Harsol27 seller sign-in: ${site}${SELLER_SIGN_IN_PATH}\nUsername: ${member.username}\nPassword: ${password}`
      : `Harsol27 sign-in: ${site}/sign-in\nEmail: ${member.email}\nPassword: ${password}`;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Members</h1>

      <form method="get" role="search" aria-label="Find members" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="q">Search name, username, email or mobile</Label>
          <Input id="q" name="q" type="search" defaultValue={params.q ?? ""} maxLength={100} />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {total === 0 ? "No members match." : `${total} ${total === 1 ? "member" : "members"}${pageCount > 1 ? ` · page ${params.page} of ${pageCount}` : ""}`}
      </p>

      {items.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Name</TableHead>
                <TableHead scope="col">Username</TableHead>
                <TableHead scope="col">Mobile and email</TableHead>
                <TableHead scope="col">Account</TableHead>
                <TableHead scope="col">Joined (IST)</TableHead>
                {isAdmin && <TableHead scope="col">Password</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((member) => {
                const password = isAdmin ? openPassword(member.issuedPassword) : null;
                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="font-mono">{member.username ?? "—"}</TableCell>
                    <TableCell>
                      <span className="block">{member.mobile ?? "—"}</span>
                      <span className="block break-all text-muted-foreground">{member.email}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {member.lead ? (
                          <Link href={`/admin/leads/${member.lead.id}`} className="text-primary underline">
                            Seller registration
                          </Link>
                        ) : (
                          <Badge variant="secondary">Buyer</Badge>
                        )}
                        {member.seller && (
                          <Link href={`/admin/sellers/${member.seller.id}`} className="text-primary underline">
                            {member.seller.companyName}
                          </Link>
                        )}
                        {member.disabledAt && <Badge variant="outline">Switched off</Badge>}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {member._count.inquiries} {member._count.inquiries === 1 ? "inquiry" : "inquiries"} sent
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatIst(member.createdAt)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex flex-col items-start gap-2">
                          {password && (
                            <span className="flex items-center gap-1 font-mono font-semibold">
                              {password}
                              <CopyButton value={signInText(member, password)} what="sign-in details" compact />
                            </span>
                          )}
                          {!member.disabledAt && <ResetMemberPassword userId={member.id} name={member.name} email={member.email} />}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex justify-between gap-4">
          {params.page > 1 ? (
            <Button asChild variant="outline">
              <Link href={pageHref(params, params.page - 1)}>Previous page</Link>
            </Button>
          ) : (
            <span />
          )}
          {params.page < pageCount && (
            <Button asChild variant="outline">
              <Link href={pageHref(params, params.page + 1)}>Next page</Link>
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
