"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/server/authz";
import { runAction, type ActionResult } from "@/server/errors";
import {
  attachPhoto,
  createPhotoUpload,
  createProduct,
  deletePhoto,
  movePhoto,
  requireApprovedSeller,
  setProductHidden,
  updateProduct,
} from "@/server/products";

const ok: ActionResult = { ok: true, data: undefined };

async function account() {
  return requireApprovedSeller(await requireMember("/seller/products"));
}

export async function createProductAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  let id: string | undefined;
  const result = await runAction("createProduct", async () => {
    id = await createProduct(await account(), formData);
    return ok;
  });
  if (result.ok && id) redirect(`/seller/products/${id}?created=1`); // next step: add photos
  return result;
}

export async function updateProductAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("updateProduct", async () => {
    const productId = String(formData.get("productId") ?? "");
    await updateProduct(await account(), productId, formData);
    revalidatePath(`/seller/products/${productId}`);
    return ok;
  });
}

export async function setHiddenAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("setProductHidden", async () => {
    const productId = String(formData.get("productId") ?? "");
    await setProductHidden(await account(), productId, formData.get("hidden") === "true");
    revalidatePath(`/seller/products/${productId}`);
    return ok;
  });
}

export async function createPhotoUploadAction(productId: string, file: { fileName: string; contentType: string; sizeBytes: number }) {
  return runAction("createPhotoUpload", async () => ({ ok: true as const, data: await createPhotoUpload(await account(), productId, file) }));
}

export async function attachPhotoAction(productId: string, key: string): Promise<ActionResult> {
  return runAction("attachPhoto", async () => {
    await attachPhoto(await account(), productId, key);
    return ok;
  });
}

export async function deletePhotoAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("deletePhoto", async () => {
    await deletePhoto(await account(), formData.get("photoId"));
    revalidatePath(`/seller/products/${String(formData.get("productId") ?? "")}`);
    return ok;
  });
}

export async function movePhotoAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction("movePhoto", async () => {
    await movePhoto(await account(), formData.get("photoId"), formData.get("direction") === "up" ? "up" : "down");
    revalidatePath(`/seller/products/${String(formData.get("productId") ?? "")}`);
    return ok;
  });
}
