"use client";

import { ArrowUp, MessageCircle } from "lucide-react";
import { useSyncExternalStore } from "react";
import { scrollToTop } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/contact";

const SHOW_AFTER = 600; // px scrolled before "Back to top" appears

const subscribe = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};
const scrolledDown = () => window.scrollY > SHOW_AFTER;

/**
 * Bottom-right corner: "Back to top" once you have scrolled a way down, and "Talk to us", which opens a
 * WhatsApp chat with the team from any page.
 * Sticky at the end of the main content (a zero-height bar, the buttons hanging above it): they ride the
 * bottom of the screen while you scroll, and stop above the footer instead of covering it.
 */
export function FloatingActions() {
  const showTop = useSyncExternalStore(subscribe, scrolledDown, () => false);
  return (
    <div className="sticky bottom-0 z-40 h-0 print:hidden">
      <div className="absolute right-4 bottom-4 flex flex-col items-end gap-2 sm:right-6 sm:bottom-6">
        {showTop && (
          <Button type="button" variant="outline" size="icon" className="size-11 rounded-full bg-card shadow-md animate-in fade-in zoom-in-90 duration-200" aria-label="Back to top" onClick={scrollToTop}>
            <ArrowUp aria-hidden="true" />
          </Button>
        )}
        <Button asChild className="h-11 rounded-full px-5 shadow-lg">
          <a href={CONTACT.whatsappLink} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden="true" />
            Talk to us<span className="sr-only"> on WhatsApp</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
