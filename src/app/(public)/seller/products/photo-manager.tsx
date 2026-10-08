"use client";

import { ArrowDown, ArrowUp, ImageOff, LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { FormAlert } from "@/components/form-feedback";
import { ProductPhoto } from "@/components/product-photo";
import { Label } from "@/components/ui/label";
import { PHOTO_TYPES } from "@/lib/file-type";
import { MAX_PHOTOS_PER_PRODUCT, PHOTO_MAX_BYTES } from "@/lib/product-schema";
import { attachPhotoAction, createPhotoUploadAction, deletePhotoAction, movePhotoAction } from "./actions";

type Photo = { id: string; status: "PROCESSING" | "READY" | "FAILED" };

export function PhotoManager({ productId, photos }: { productId: string; photos: Photo[] }) {
  const router = useRouter();
  const [progress, setProgress] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const processing = photos.some((p) => p.status === "PROCESSING");

  // While the worker is still resizing photos, refresh every few seconds to show them when ready.
  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(timer);
  }, [processing, router]);

  async function upload(files: File[]) {
    const room = MAX_PHOTOS_PER_PRODUCT - photos.length;
    const found: string[] = [];
    if (files.length > room) found.push(`Only ${room} more ${room === 1 ? "photo fits" : "photos fit"} (up to ${MAX_PHOTOS_PER_PRODUCT}); the rest were skipped.`);
    setBusy(true);
    setProblems([]);
    const batch = files.slice(0, Math.max(room, 0));
    for (const [i, file] of batch.entries()) {
      setProgress(`Uploading photo ${i + 1} of ${batch.length}: ${file.name}`);
      if (!(file.type in PHOTO_TYPES)) {
        found.push(`${file.name}: upload a JPG, PNG or WebP photo.`);
        continue;
      }
      if (file.size > PHOTO_MAX_BYTES) {
        found.push(`${file.name}: photos must be 10 MB or smaller.`);
        continue;
      }
      try {
        const ticket = await createPhotoUploadAction(productId, { fileName: file.name, contentType: file.type, sizeBytes: file.size });
        if (!ticket.ok) {
          found.push(`${file.name}: ${ticket.error}`);
          continue;
        }
        const put = await fetch(ticket.data.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        if (!put.ok) throw new Error(`Storage responded ${put.status}`);
        const attached = await attachPhotoAction(productId, ticket.data.key);
        if (!attached.ok) found.push(`${file.name}: ${attached.error}`);
      } catch (error) {
        console.error("Photo upload failed", error);
        found.push(`${file.name}: the upload failed. Check your connection and try again.`);
      }
    }
    setProblems(found);
    setProgress(found.length === batch.length && batch.length > 0 ? null : "Photos added. They appear below once they are ready (a few seconds).");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="photo-files">Add photos</Label>
        <input
          id="photo-files"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={busy || photos.length >= MAX_PHOTOS_PER_PRODUCT}
          aria-describedby="photo-hint photo-progress"
          className="rounded-lg border border-input bg-card p-2 text-sm"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            if (files.length) void upload(files);
          }}
        />
        <p id="photo-hint" className="text-sm text-muted-foreground">
          JPG, PNG or WebP, up to 10 MB each, up to {MAX_PHOTOS_PER_PRODUCT} photos ({photos.length} so far). The first photo is shown in search results.
        </p>
        <p id="photo-progress" aria-live="polite" className="text-sm">
          {progress}
        </p>
        {problems.length > 0 && (
          <FormAlert kind="error">
            <ul className="flex flex-col gap-1">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </FormAlert>
        )}
      </div>

      {photos.length > 0 && (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Photos, in display order">
          {photos.map((photo, i) => (
            <li key={photo.id} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex aspect-square items-center justify-center bg-secondary text-sm text-muted-foreground">
                {photo.status === "READY" ? (
                  <ProductPhoto id={photo.id} alt={`Photo ${i + 1}`} sizes="200px" className="h-full w-full object-cover" />
                ) : photo.status === "PROCESSING" ? (
                  <span className="flex items-center gap-2">
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> Processing…
                  </span>
                ) : (
                  <span className="flex flex-col items-center gap-1 p-2 text-center text-destructive">
                    <ImageOff aria-hidden="true" className="size-5" /> This file could not be read as an image.
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="text-sm">{i === 0 ? "Main photo" : `Photo ${i + 1}`}</span>
                <div className="flex gap-1">
                  {(["up", "down"] as const).map((direction) => (
                    <ActionForm key={direction} action={movePhotoAction}>
                      <input type="hidden" name="productId" value={productId} />
                      <input type="hidden" name="photoId" value={photo.id} />
                      <input type="hidden" name="direction" value={direction} />
                      <SubmitButton variant="ghost" size="icon" disabled={direction === "up" ? i === 0 : i === photos.length - 1} aria-label={`Move photo ${i + 1} ${direction}`}>
                        {direction === "up" ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
                      </SubmitButton>
                    </ActionForm>
                  ))}
                  <ActionForm action={deletePhotoAction}>
                    <input type="hidden" name="productId" value={productId} />
                    <input type="hidden" name="photoId" value={photo.id} />
                    <SubmitButton variant="ghost" size="icon" aria-label={`Delete photo ${i + 1}`}>
                      <Trash2 aria-hidden="true" />
                    </SubmitButton>
                  </ActionForm>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
