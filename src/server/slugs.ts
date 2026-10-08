import { slugify } from "@/lib/slug";

/**
 * A URL slug for `name` that is not yet taken: "acme-steels", then "acme-steels-2", "-3", ….
 * `takenStartingWith` returns the existing slugs that begin with the given prefix.
 */
export async function uniqueSlug(name: string, fallback: string, takenStartingWith: (prefix: string) => Promise<string[]>): Promise<string> {
  const base = slugify(name) || fallback;
  const taken = new Set(await takenStartingWith(base));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}
