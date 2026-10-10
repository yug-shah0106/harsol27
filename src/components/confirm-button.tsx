"use client";

import { useId, useRef } from "react";
import { SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";

/**
 * A submit button that asks first: it opens a dialog, and only the dialog's button submits the form
 * (with this button's name and value). Native <dialog>: focus stays inside, Escape cancels.
 * Use for actions that can't be undone, or that tell someone outside the team.
 */
export function ConfirmButton({
  children,
  title,
  description,
  confirmLabel,
  name,
  value,
  ...trigger
}: Omit<React.ComponentProps<typeof Button>, "type" | "onClick"> & { title: string; description: string; confirmLabel?: string; name?: string; value?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  return (
    <>
      <Button type="button" variant="destructive" {...trigger} onClick={() => dialog.current?.showModal()}>
        {children}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-text`}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xl backdrop:bg-foreground/40 open:animate-in open:fade-in open:zoom-in-95"
      >
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          {title}
        </h2>
        <p id={`${id}-text`} className="mt-2 text-muted-foreground">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {/* The safe choice has the focus first. */}
          <Button type="button" variant="outline" autoFocus onClick={() => dialog.current?.close()}>
            Cancel
          </Button>
          <SubmitButton name={name} value={value} variant="destructive" onClick={() => dialog.current?.close()}>
            {confirmLabel ?? children}
          </SubmitButton>
        </div>
      </dialog>
    </>
  );
}
