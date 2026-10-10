import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BUSINESS_CATEGORIES } from "@/lib/lead-schema";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/lead-status";
import { requireStaff } from "@/server/authz";
import { listAllIndustries } from "@/server/industries";
import { leadListParamsSchema, listLeads, type LeadListParams } from "@/server/leads";
import { categoryLabel, formatIst } from "./format";

export const metadata: Metadata = { title: "Leads" };

function pageHref(params: LeadListParams, page: number): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, page })) {
    if (value !== undefined && value !== "" && !(key === "sort" && value === "newest") && !(key === "page" && value === 1)) {
      qs.set(key, String(value));
    }
  }
  const s = qs.toString();
  return s ? `/admin/leads?${s}` : "/admin/leads";
}

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  await requireStaff();
  const params = leadListParamsSchema.parse(await searchParams);
  const [{ items, total, pageCount }, industries] = await Promise.all([listLeads(params), listAllIndustries()]);
  const filtered = Boolean(params.status || params.industry || params.category || params.q);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Leads</h1>

      {/* Plain GET form: filters live in the URL, so a filtered view can be bookmarked or shared. */}
      <form method="get" className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end" role="search" aria-label="Filter leads">
        <div className="flex flex-col gap-1 lg:col-span-2">
          <Label htmlFor="q">Search name, email or phone</Label>
          <Input id="q" name="q" type="search" defaultValue={params.q ?? ""} maxLength={100} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="status">Status</Label>
          <Dropdown
            id="status"
            name="status"
            defaultValue={params.status ?? ""}
            className="w-full"
            options={[{ value: "", label: "Any" }, ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))]}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="industry">Industry</Label>
          <Dropdown
            id="industry"
            name="industry"
            defaultValue={params.industry ?? ""}
            className="w-full"
            options={[{ value: "", label: "Any" }, ...industries.map((i) => ({ value: i.id, label: i.name }))]}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="category">Category</Label>
          <Dropdown
            id="category"
            name="category"
            defaultValue={params.category ?? ""}
            className="w-full"
            options={[{ value: "", label: "Any" }, ...BUSINESS_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))]}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="sort">Sort by</Label>
          <Dropdown
            id="sort"
            name="sort"
            defaultValue={params.sort}
            className="w-full"
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "name", label: "Name A–Z" },
            ]}
          />
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <Button type="submit">Apply</Button>
          {filtered && (
            <Button asChild variant="outline">
              <Link href="/admin/leads">Clear filters</Link>
            </Button>
          )}
        </div>
      </form>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {total === 0 ? "No leads match." : `${total} ${total === 1 ? "lead" : "leads"}${pageCount > 1 ? ` · page ${params.page} of ${pageCount}` : ""}`}
      </p>

      {items.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Name</TableHead>
                <TableHead scope="col">Contact</TableHead>
                <TableHead scope="col">Industry</TableHead>
                <TableHead scope="col">Category</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Received (IST)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/leads/${lead.id}`} className="text-primary underline">
                      {lead.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{lead.phone}</div>
                    <div className="text-muted-foreground">{lead.email}</div>
                  </TableCell>
                  <TableCell>{lead.industry.name}</TableCell>
                  <TableCell>{categoryLabel(lead.businessCategory)}</TableCell>
                  <TableCell>
                    <Badge variant={lead.status === "NEW" ? "default" : "secondary"}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatIst(lead.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
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
