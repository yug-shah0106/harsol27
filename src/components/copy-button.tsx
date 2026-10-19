"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Copies `value` to the clipboard. `what` completes the button's name for screen readers: "Copy phone number".
 * `compact`: just the icon (for values in a list), with the same name.
 */
export function CopyButton({ value, what, compact = false }: { value: string; what: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions, an old browser): the details are on screen to copy by hand.
    }
  };
  return (
    <>
      <Button
        type="button"
        variant={compact ? "ghost" : "outline"}
        size={compact ? "icon" : "sm"}
        className={compact ? "shrink-0 rounded-full text-muted-foreground" : "h-10 shrink-0 rounded-full px-4"}
        title={compact ? `Copy ${what}` : undefined}
        onClick={copy}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        <span className={compact ? "sr-only" : undefined}>{copied ? "Copied" : "Copy"}</span>
        <span className="sr-only"> {what}</span>
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? `${what} copied` : ""}
      </span>
    </>
  );
}
