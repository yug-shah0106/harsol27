import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { INDIAN_STATES } from "@/lib/seller-schema";

type Values = { q?: string; industry?: string; state?: string; city?: string };

/** Plain GET form: results live at a shareable URL and work without JavaScript. */
export function SearchForm({ values = {}, industries, action = "/search", compact = false }: { values?: Values; industries?: { slug: string; name: string }[]; action?: string; compact?: boolean }) {
  if (compact) {
    return (
      <form method="get" action={action} role="search" className="flex w-full max-w-xl gap-2">
        <Label htmlFor="hero-q" className="sr-only">
          Search products
        </Label>
        <Input id="hero-q" name="q" type="search" placeholder="Search products, e.g. khakhra or SS pipe" defaultValue={values.q} maxLength={100} className="h-12 text-base" />
        <Button type="submit" size="lg">
          <Search aria-hidden="true" />
          Search
        </Button>
      </form>
    );
  }
  return (
    <form method="get" action={action} role="search" aria-label="Search products" className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <div className="flex flex-col gap-1 lg:col-span-2">
        <Label htmlFor="q">What are you looking for?</Label>
        <Input id="q" name="q" type="search" defaultValue={values.q} maxLength={100} placeholder="e.g. khakhra, brass fittings, SS pipe" />
      </div>
      {industries && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="industry">Industry</Label>
          <Dropdown
            id="industry"
            name="industry"
            defaultValue={values.industry ?? ""}
            className="w-full"
            options={[{ value: "", label: "All industries" }, ...industries.map((i) => ({ value: i.slug, label: i.name }))]}
          />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Label htmlFor="state">State</Label>
        <Dropdown
          id="state"
          name="state"
          defaultValue={values.state ?? ""}
          className="w-full"
          options={[{ value: "", label: "Anywhere" }, ...INDIAN_STATES.map((s) => ({ value: s, label: s }))]}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" defaultValue={values.city} maxLength={80} />
      </div>
      <Button type="submit" className="sm:col-span-2 lg:col-span-5 lg:w-fit">
        <Search aria-hidden="true" />
        Search
      </Button>
    </form>
  );
}
