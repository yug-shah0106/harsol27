"use client";

import { ArrowDown, ArrowUp, ImageOff, LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { FormAlert } from "@/components/form-feedback";
import { useI18n } from "@/components/i18n";
import { ProductPhoto } from "@/components/product-photo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PHOTO_TYPES } from "@/lib/file-type";
import { fill, translateError } from "@/lib/i18n";
import { MAX_PHOTOS_PER_PRODUCT, PHOTO_MAX_BYTES } from "@/lib/product-schema";
import { attachPhotoAction, createPhotoUploadAction, deletePhotoAction, movePhotoAction, renamePhotoAction } from "./actions";

type Photo = { id: string; status: "PROCESSING" | "READY" | "FAILED"; name: string | null };

export function PhotoManager({ productId, photos }: { productId: string; photos: Photo[] }) {
  const router = useRouter();
  const { t } = useI18n();
  const s = t.sellerArea;
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
    if (files.length > room) found.push(fill(room === 1 ? s.oneMore : s.moreFit, { room, max: MAX_PHOTOS_PER_PRODUCT }));
    setBusy(true);
    setProblems([]);
    const batch = files.slice(0, Math.max(room, 0));
    for (const [i, file] of batch.entries()) {
      setProgress(fill(s.uploadingPhoto, { i: i + 1, n: batch.length, name: file.name }));
      if (!(file.type in PHOTO_TYPES)) {
        found.push(fill(s.wrongType, { name: file.name }));
        continue;
      }
      if (file.size > PHOTO_MAX_BYTES) {
        found.push(fill(s.tooBig, { name: file.name }));
        continue;
      }
      try {
        const ticket = await createPhotoUploadAction(productId, { fileName: file.name, contentType: file.type, sizeBytes: file.size });
        if (!ticket.ok) {
          found.push(fill(s.fileError, { name: file.name, error: translateError(t, ticket.error) }));
          continue;
        }
        const put = await fetch(ticket.data.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        if (!put.ok) throw new Error(`Storage responded ${put.status}`);
        const attached = await attachPhotoAction(productId, ticket.data.key);
        if (!attached.ok) found.push(fill(s.fileError, { name: file.name, error: translateError(t, attached.error) }));
      } catch (error) {
        console.error("Photo upload failed", error);
        found.push(fill(s.uploadFailed, { name: file.name }));
      }
    }
    setProblems(found);
    setProgress(found.length === batch.length && batch.length > 0 ? null : s.photosAdded);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="photo-files">{s.addPhotos}</Label>
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
          {fill(s.photoHint, { max: MAX_PHOTOS_PER_PRODUCT, count: photos.length })} {s.photoNamesHint}
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
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label={s.photoOrder}>
          {photos.map((photo, i) => (
            <li key={photo.id} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex aspect-square items-center justify-center bg-secondary text-sm text-muted-foreground">
                {photo.status === "READY" ? (
                  <ProductPhoto id={photo.id} alt={fill(s.photoN, { n: i + 1 })} sizes="200px" className="h-full w-full object-cover" />
                ) : photo.status === "PROCESSING" ? (
                  <span className="flex items-center gap-2">
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> {s.processing}
                  </span>
                ) : (
                  <span className="flex flex-col items-center gap-1 p-2 text-center text-destructive">
                    <ImageOff aria-hidden="true" className="size-5" /> {s.unreadable}
                  </span>
                )}
              </div>
              {/* Its name (a model or size), shown to buyers under the photo. */}
              <ActionForm action={renamePhotoAction} successMessage={s.saved} className="flex flex-col gap-1 px-2 pt-2">
                <input type="hidden" name="productId" value={productId} />
                <input type="hidden" name="photoId" value={photo.id} />
                <label htmlFor={`photo-name-${photo.id}`} className="sr-only">
                  {fill(s.photoName, { n: i + 1 })}
                </label>
                <div className="flex gap-1">
                  <Input id={`photo-name-${photo.id}`} name="name" defaultValue={photo.name ?? ""} maxLength={60} placeholder={s.photoNamePlaceholder} className="h-9 min-w-0" />
                  <SubmitButton variant="outline" size="sm" className="h-9 shrink-0" aria-label={fill(s.savePhotoName, { n: i + 1 })}>
                    {s.saveShort}
                  </SubmitButton>
                </div>
              </ActionForm>
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="text-sm">{i === 0 ? s.mainPhoto : fill(s.photoN, { n: i + 1 })}</span>
                <div className="flex gap-1">
                  {(["up", "down"] as const).map((direction) => (
                    <ActionForm key={direction} action={movePhotoAction}>
                      <input type="hidden" name="productId" value={productId} />
                      <input type="hidden" name="photoId" value={photo.id} />
                      <input type="hidden" name="direction" value={direction} />
                      <SubmitButton variant="ghost" size="icon" disabled={direction === "up" ? i === 0 : i === photos.length - 1} aria-label={fill(direction === "up" ? s.moveUp : s.moveDown, { n: i + 1 })}>
                        {direction === "up" ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
                      </SubmitButton>
                    </ActionForm>
                  ))}
                  <ActionForm action={deletePhotoAction}>
                    <input type="hidden" name="productId" value={productId} />
                    <input type="hidden" name="photoId" value={photo.id} />
                    <ConfirmButton
                      variant="ghost"
                      size="icon"
                      aria-label={fill(s.deletePhoto, { n: i + 1 })}
                      title={fill(s.deleteTitle, { n: i + 1 })}
                      description={s.deleteBody}
                      confirmLabel={s.deleteConfirm}
                    >
                      <Trash2 aria-hidden="true" />
                    </ConfirmButton>
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
