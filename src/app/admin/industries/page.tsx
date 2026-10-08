import { ArrowDown, ArrowUp } from "lucide-react";
import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireStaff } from "@/server/authz";
import { listAllIndustries } from "@/server/industries";
import { canWrite } from "@/server/staff-policy";
import { createIndustryAction, moveIndustryAction, renameIndustryAction, setIndustryActiveAction } from "./actions";

export const metadata: Metadata = { title: "Industries" };

export default async function IndustriesPage() {
  const staff = await requireStaff();
  const editable = canWrite(staff);
  const industries = await listAllIndustries();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Industries</h1>
        <p className="mt-1 text-muted-foreground">
          Shown on the lead form and the home page in this order. Industries are never deleted: deactivate one to hide it.
        </p>
      </div>

      {editable ? (
        <ActionForm action={createIndustryAction} className="flex max-w-xl flex-col gap-2" successMessage="Industry added.">
          <Label htmlFor="new-industry">Add an industry</Label>
          <div className="flex gap-2">
            <Input id="new-industry" name="name" required minLength={2} maxLength={60} />
            <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
          </div>
        </ActionForm>
      ) : (
        <p className="rounded-lg border border-border bg-secondary p-3 text-sm">You have view-only access.</p>
      )}

      <ol className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
        {industries.map((industry, index) => (
          <li key={industry.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{industry.name}</span>
                {industry.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
              </div>
              <span className="text-sm text-muted-foreground">
                /{industry.slug} · {industry._count.leads} {industry._count.leads === 1 ? "lead" : "leads"}
              </span>
            </div>

            {editable && (
              <div className="flex flex-wrap items-start gap-2">
                <ActionForm action={renameIndustryAction} className="flex flex-col gap-1">
                  <input type="hidden" name="id" value={industry.id} />
                  <div className="flex gap-2">
                    <Label htmlFor={`rename-${industry.id}`} className="sr-only">
                      New name for {industry.name}
                    </Label>
                    <Input id={`rename-${industry.id}`} name="name" defaultValue={industry.name} required minLength={2} maxLength={60} className="w-48" />
                    <SubmitButton variant="outline">
                      Rename<span className="sr-only"> {industry.name}</span>
                    </SubmitButton>
                  </div>
                </ActionForm>
                <ActionForm action={moveIndustryAction}>
                  <input type="hidden" name="id" value={industry.id} />
                  <input type="hidden" name="direction" value="up" />
                  <SubmitButton variant="outline" size="icon-lg" disabled={index === 0} aria-label={`Move ${industry.name} up`}>
                    <ArrowUp aria-hidden="true" />
                  </SubmitButton>
                </ActionForm>
                <ActionForm action={moveIndustryAction}>
                  <input type="hidden" name="id" value={industry.id} />
                  <input type="hidden" name="direction" value="down" />
                  <SubmitButton variant="outline" size="icon-lg" disabled={index === industries.length - 1} aria-label={`Move ${industry.name} down`}>
                    <ArrowDown aria-hidden="true" />
                  </SubmitButton>
                </ActionForm>
                <ActionForm action={setIndustryActiveAction}>
                  <input type="hidden" name="id" value={industry.id} />
                  <input type="hidden" name="active" value={String(!industry.isActive)} />
                  <SubmitButton variant={industry.isActive ? "destructive" : "secondary"}>
                    {industry.isActive ? "Deactivate" : "Activate"}
                    <span className="sr-only"> {industry.name}</span>
                  </SubmitButton>
                </ActionForm>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
