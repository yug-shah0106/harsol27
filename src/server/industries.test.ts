import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./db";
import { createIndustry, industryNameKey, moveIndustry, renameIndustry, setIndustryActive } from "./industries";
import type { StaffUser } from "./staff-policy";

const run = crypto.randomUUID().slice(0, 8);
let admin: StaffUser;

const byName = (name: string) => db().industry.findUniqueOrThrow({ where: { nameKey: industryNameKey(name) } });

beforeAll(async () => {
  const user = await db().user.create({ data: { name: "Industry Admin", email: `ind-admin-${run}@example.test`, role: "ADMIN" } });
  admin = { id: user.id, name: user.name, email: user.email, role: "ADMIN" };
});

afterAll(() => db().$disconnect());

describe("industries", () => {
  it("creates an industry at the end of the list with a URL slug, and audits it", async () => {
    await createIndustry(`  Food   ${run} & Snacks `, admin);
    const industry = await byName(`Food ${run} & Snacks`);
    expect(industry).toMatchObject({ name: `Food ${run} & Snacks`, slug: `food-${run}-and-snacks`, isActive: true });
    const { _max } = await db().industry.aggregate({ _max: { sortOrder: true } });
    expect(industry.sortOrder).toBe(_max.sortOrder);
    expect(await db().auditLog.count({ where: { entityId: industry.id, action: "INDUSTRY_CREATED", actorId: admin.id } })).toBe(1);
  });

  it("rejects names that differ only in case or spacing", async () => {
    await expect(createIndustry(`FOOD ${run} &  SNACKS`, admin)).rejects.toThrow(/already exists/);
  });

  it("rejects names that are too short or too long", async () => {
    await expect(createIndustry(" a ", admin)).rejects.toThrow(/at least 2/);
    await expect(createIndustry("x".repeat(61), admin)).rejects.toThrow(/60 characters/);
  });

  it("renames without changing the slug, and refuses a name another industry uses", async () => {
    await createIndustry(`Steel ${run}`, admin);
    await renameIndustry((await byName(`Steel ${run}`)).id, `Steel & Metal ${run}`, admin);
    const renamed = await byName(`Steel & Metal ${run}`);
    expect(renamed.slug).toBe(`steel-${run}`);
    await expect(renameIndustry(renamed.id, `food ${run} & snacks`, admin)).rejects.toThrow(/already exists/);
  });

  it("moves an industry up and down by swapping with its neighbour", async () => {
    const a = await byName(`Food ${run} & Snacks`);
    const b = await byName(`Steel & Metal ${run}`);
    await moveIndustry(b.id, "up", admin);
    expect((await byName(b.name)).sortOrder).toBe(a.sortOrder);
    expect((await byName(a.name)).sortOrder).toBe(b.sortOrder);
    await moveIndustry(b.id, "down", admin);
    expect((await byName(b.name)).sortOrder).toBe(b.sortOrder);
  });

  it("deactivates and reactivates (never deletes), auditing only real changes", async () => {
    const { id } = await byName(`Steel & Metal ${run}`);
    await setIndustryActive(id, false, admin);
    await setIndustryActive(id, false, admin); // double click
    expect((await db().industry.findUniqueOrThrow({ where: { id } })).isActive).toBe(false);
    await setIndustryActive(id, true, admin);
    const actions = (await db().auditLog.findMany({ where: { entityId: id }, orderBy: { createdAt: "asc" } })).map((l) => l.action);
    expect(actions.filter((a) => a.startsWith("INDUSTRY_DE") || a === "INDUSTRY_ACTIVATED")).toEqual([
      "INDUSTRY_DEACTIVATED",
      "INDUSTRY_ACTIVATED",
    ]);
  });
});
