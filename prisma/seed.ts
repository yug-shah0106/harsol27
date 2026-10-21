/**
 * Starting list of broad industries (goods, then services). Sellers pick one and describe their own
 * products or services inside it (e.g. khakhra and thepla under Food Products). Staff manage the list afterwards in /admin/industries.
 *
 * Safe to run repeatedly: only industries whose name is not already present are added, at the end
 * of the list, so edits made in the admin area are never overwritten.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

export const STARTING_INDUSTRIES = [
  "Food Products",
  "Textiles & Garments",
  "Diamonds & Jewellery",
  "Chemicals & Dyes",
  "Pharmaceuticals",
  "Plastics & Polymers",
  "Steel & Metal Products",
  "Brass Parts",
  "Engineering & Machinery",
  "Ceramics & Tiles",
  "Agriculture & Agro Products",
  "Packaging",
  "Electrical & Electronics",
  "Auto Parts",
  "Building Materials",
  "Handicrafts",
  "Furniture",
  "Paper & Printing",
  // Services (added 2026-10-11)
  "Mehendi",
  "Decoration",
  "IT Services",
  "Currency Exchange",
  "Broker",
  "Insurance Agent", // "LIC Agent" until 2026-10-21
  "Investment Firm",
  "CA Services",
  "Lawyer Services",
  "Teacher / Study",
  "Education",
  "Anchor",
  "Event Management",
  "Videography",
  "Photography",
  "Digital Media",
  "Tours & Travels",
  "Graphic Designer",
  "Interior Designer",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const existing = new Set((await db.industry.findMany({ select: { nameKey: true } })).map((i) => i.nameKey));
    // At every start on Render (scripts/render-start.sh): fill an empty list only, so industries staff removed stay removed.
    if (process.argv.includes("--if-empty") && existing.size > 0) {
      console.log("Industries: already set up.");
      return;
    }
    const { _max } = await db.industry.aggregate({ _max: { sortOrder: true } });
    let order = _max.sortOrder ?? 0;
    let added = 0;
    for (const name of STARTING_INDUSTRIES) {
      const nameKey = name.toLowerCase();
      if (existing.has(nameKey)) continue;
      await db.industry.create({ data: { name, nameKey, slug: slugify(name), sortOrder: ++order } });
      added++;
    }
    console.log(`Industries: ${added} added, ${STARTING_INDUSTRIES.length - added} already present.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
