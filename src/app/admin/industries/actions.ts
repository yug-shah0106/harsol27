"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/authz";
import { runAction, UserFacingError, type ActionResult } from "@/server/errors";
import { createIndustry, moveIndustry, renameIndustry, setIndustryActive } from "@/server/industries";

const ok: ActionResult = { ok: true, data: undefined };

function idFrom(formData: FormData): string {
  const parsed = z.uuid().safeParse(formData.get("id"));
  if (!parsed.success) throw new UserFacingError("This industry could not be found. Reload the page.");
  return parsed.data;
}

function done(): ActionResult {
  revalidatePath("/admin/industries");
  return ok;
}

export async function createIndustryAction(_prev: ActionResult | null, formData: FormData) {
  return runAction("createIndustry", async () => {
    await createIndustry(formData.get("name"), await requireAdmin());
    return done();
  });
}

export async function renameIndustryAction(_prev: ActionResult | null, formData: FormData) {
  return runAction("renameIndustry", async () => {
    await renameIndustry(idFrom(formData), formData.get("name"), await requireAdmin());
    return done();
  });
}

export async function moveIndustryAction(_prev: ActionResult | null, formData: FormData) {
  return runAction("moveIndustry", async () => {
    const direction = formData.get("direction") === "up" ? "up" : "down";
    await moveIndustry(idFrom(formData), direction, await requireAdmin());
    return done();
  });
}

export async function setIndustryActiveAction(_prev: ActionResult | null, formData: FormData) {
  return runAction("setIndustryActive", async () => {
    await setIndustryActive(idFrom(formData), formData.get("active") === "true", await requireAdmin());
    return done();
  });
}
