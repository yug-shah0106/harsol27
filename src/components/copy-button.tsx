"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Copies `value` to the clipboard. `what` completes the button's name for screen readers: "Copy phone number". */
export function CopyButton({ value, what }: { value: string; what: string }) {
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
      <Button type="button" variant="outline" size="sm" className="h-10 shrink-0 rounded-full px-4" onClick={copy}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
        <span className="sr-only"> {what}</span>
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? `${what} copied` : ""}
      </span>
    </>
  );
}
