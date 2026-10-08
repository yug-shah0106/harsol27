/**
 * Search speed at scale: fills a throwaway database with sellers and products, then times the real
 * catalogue queries (src/server/catalog.ts). It refuses to run unless the database name ends in
 * "_bench", so it can never touch real data.
 *
 *   docker compose -f compose.dev.yml exec db createdb -U harsol27 harsol27_bench
 *   export DATABASE_URL=postgresql://harsol27:local-dev-password@127.0.0.1:5433/harsol27_bench
 *   pnpm exec prisma migrate deploy && pnpm db:seed
 *   NODE_OPTIONS=--conditions=react-server pnpm exec tsx scripts/search-benchmark.ts 100000
 *   docker compose -f compose.dev.yml exec db dropdb -U harsol27 harsol27_bench
 */
import "dotenv/config"; // other settings; the DATABASE_URL given on the command line wins
import { Client } from "pg";
import { listIndustriesWithCounts, listPublicSlugs, searchProducts, searchParamsSchema } from "../src/server/catalog";
import { db } from "../src/server/db";

const WORDS = [
  "khakhra", "thepla", "methi", "masala", "papad", "farsan", "chikki", "steel", "pipe", "sheet", "brass", "fitting",
  "valve", "cotton", "fabric", "saree", "denim", "yarn", "ceramic", "tile", "sanitary", "diamond", "polished", "jewellery",
  "chemical", "dye", "pigment", "resin", "plastic", "granule", "packaging", "pouch", "carton", "pump", "motor", "bearing",
  "engine", "spare", "groundnut", "oil", "cumin", "spice", "salt", "pharma", "tablet", "machine", "lathe", "printing",
];

async function seed(products: number) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM "Product"`);
  if (rows[0]!.n >= products) {
    console.log(`Already ${rows[0]!.n} products; not adding more.`);
    return client.end();
  }
  const sellers = Math.ceil(products / 20);
  console.log(`Adding ${sellers} sellers and ${products} products…`);
  await client.query("BEGIN");
  await client.query(
    `INSERT INTO "User" ("id","name","email","phoneNumber","phoneNumberVerified","role","emailVerified","createdAt","updatedAt")
     SELECT gen_random_uuid(), 'Bench ' || g, 'bench' || g || '@phone.harsol27.invalid', '+9170' || lpad(g::text, 8, '0'), true, 'MEMBER', false, now(), now()
     FROM generate_series(1, $1) g`,
    [sellers],
  );
  await client.query(
    `INSERT INTO "Seller" ("id","userId","companyName","slug","city","state","contactName","contactPhone","contactEmail","status","paidUntil","createdAt","updatedAt")
     SELECT gen_random_uuid(), u."id", initcap(($2::text[])[1 + (g % 48)]) || ' Industries ' || g, 'bench-seller-' || g,
            (ARRAY['Rajkot','Ahmedabad','Surat','Vadodara','Jamnagar','Morbi'])[1 + (g % 6)], 'Gujarat', 'Owner ' || g,
            '+9179' || lpad(g::text, 8, '0'), 'bench' || g || '@example.test',
            CASE WHEN g % 10 = 0 THEN 'SUSPENDED' ELSE 'APPROVED' END::"SellerStatus", current_date + (g % 400) - 30, now(), now()
     FROM generate_series(1, $1) g JOIN "User" u ON u."email" = 'bench' || g || '@phone.harsol27.invalid'`,
    [sellers, WORDS],
  );
  await client.query(
    `INSERT INTO "Product" ("id","sellerId","industryId","name","slug","description","createdAt","updatedAt")
     SELECT gen_random_uuid(), s."id", i."id",
            initcap(($3::text[])[1 + (g * 7 % 48)] || ' ' || ($3::text[])[1 + (g * 13 % 48)]) || ' ' || g,
            'bench-product-' || g,
            'Quality ' || ($3::text[])[1 + (g * 3 % 48)] || ' and ' || ($3::text[])[1 + (g * 11 % 48)] || ' for traders and manufacturers. Supplied in bulk across Gujarat, packed to order. Batch ' || g,
            now() - (g || ' minutes')::interval, now()
     FROM generate_series(1, $1) g
     JOIN "Seller" s ON s."slug" = 'bench-seller-' || (1 + g % $2)
     JOIN LATERAL (SELECT "id" FROM "Industry" ORDER BY "sortOrder" OFFSET (g % 18) LIMIT 1) i ON true`,
    [products, sellers, WORDS],
  );
  await client.query("COMMIT");
  await client.query("ANALYZE");
  await client.end();
}

async function time(label: string, run: () => Promise<unknown>, times = 15) {
  await run(); // warm up
  const ms: number[] = [];
  for (let i = 0; i < times; i++) {
    const start = performance.now();
    await run();
    ms.push(performance.now() - start);
  }
  ms.sort((a, b) => a - b);
  console.log(`${label.padEnd(44)} median ${ms[Math.floor(times / 2)]!.toFixed(1).padStart(7)} ms   slowest ${ms.at(-1)!.toFixed(1).padStart(7)} ms`);
}

async function main() {
  const name = new URL(process.env.DATABASE_URL ?? "postgresql://x/none").pathname.slice(1);
  if (!name.endsWith("_bench")) throw new Error(`Refusing to run against "${name}": the database name must end in _bench.`);
  await seed(Number(process.argv[2] ?? 100_000));

  const search = (q: Record<string, string>) => () => searchProducts(searchParamsSchema.parse(q));
  await time('search "khakhra"', search({ q: "khakhra" }));
  await time('search "steel pipe" (two words)', search({ q: "steel pipe" }));
  await time('search "masala" in Food Products', search({ q: "masala", industry: "food-products" }));
  await time('search company name "industries 4242"', search({ q: "industries 4242" }));
  await time("search with no match", search({ q: "zzqxv" }));
  await time("search page 40 (no words)", search({ page: "40" }));
  await time("browse one industry", search({ industry: "food-products" }));
  await time("industry list with product counts", () => listIndustriesWithCounts());
  await time("sitemap (all public slugs)", () => listPublicSlugs(), 5);
  await db().$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
