import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { HTML_LANG, industryName } from "@/lib/i18n";
import { INDIAN_STATES } from "@/lib/seller-schema";
import { getLocale, getMessages } from "@/server/locale";

type Values = { q?: string; industry?: string; state?: string; city?: string };

/** Plain GET form: results live at a shareable URL and work without JavaScript. */
export async function SearchForm({ values = {}, industries, action = "/search", compact = false }: { values?: Values; industries?: { slug: string; name: string }[]; action?: string; compact?: boolean }) {
  const [locale, t] = [await getLocale(), await getMessages()];
  const s = t.search;
  if (compact) {
    return (
      <form method="get" action={action} role="search" className="flex w-full max-w-xl gap-2">
        <Label htmlFor="hero-q" className="sr-only">
          {s.label}
        </Label>
        <Input id="hero-q" name="q" type="search" placeholder={s.placeholderShort} defaultValue={values.q} maxLength={100} className="h-12 rounded-full px-5 text-base" />
        <Button type="submit" size="lg" className="rounded-full">
          <Search aria-hidden="true" />
          {s.button}
        </Button>
      </form>
    );
  }
  return (
    <form method="get" action={action} role="search" aria-label={s.label} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <div className="flex flex-col gap-1 lg:col-span-2">
        <Label htmlFor="q">{s.what}</Label>
        <Input id="q" name="q" type="search" defaultValue={values.q} maxLength={100} placeholder={s.placeholder} />
      </div>
      {industries && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="industry">{s.industry}</Label>
          <Dropdown
            id="industry"
            name="industry"
            defaultValue={values.industry ?? ""}
            className="w-full"
            searchable={{ placeholder: t.registration.industrySearch }}
            options={[
              { value: "", label: s.allIndustries, pinned: true },
              ...industries.map((i) => ({ value: i.slug, label: industryName(t, i.name) })).sort((a, b) => a.label.localeCompare(b.label, HTML_LANG[locale])),
            ]}
          />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Label htmlFor="state">{s.state}</Label>
        <Dropdown
          id="state"
          name="state"
          defaultValue={values.state ?? ""}
          className="w-full"
          options={[{ value: "", label: s.anywhere }, ...INDIAN_STATES.map((s) => ({ value: s, label: s }))]}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="city">{s.city}</Label>
        <Input id="city" name="city" defaultValue={values.city} maxLength={80} />
      </div>
      <Button type="submit" className="sm:col-span-2 lg:col-span-5 lg:w-fit">
        <Search aria-hidden="true" />
        {s.button}
      </Button>
    </form>
  );
}
