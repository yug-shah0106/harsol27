"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

/** The header's links on phones (below 640px): a button that opens them as a panel under the header. */
export function MobileMenu({ links, initialDark }: { links: { href: string; label: string }[]; initialDark: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  return (
    <div className="sm:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 rounded-full"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label="Menu"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </Button>
      {open && (
        <nav id="mobile-menu" aria-label="Menu" className="absolute inset-x-0 top-full border-b border-border bg-card shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="flex flex-col px-4 py-2">
            {links.map((link) => (
              <li key={link.href} className="border-b border-border last:border-0">
                <Link href={link.href} onClick={() => setOpen(false)} className="block py-3 font-display text-2xl no-underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-sm text-muted-foreground">
            Dark mode
            <ThemeToggle initialDark={initialDark} />
          </div>
        </nav>
      )}
    </div>
  );
}
