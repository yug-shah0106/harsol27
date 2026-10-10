"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { THEME_COOKIE } from "@/lib/preferences";

/**
 * Dark mode on or off. The choice goes on <html> straight away and into a cookie, so the server
 * renders the next page in it too (no flash of the wrong theme). Light unless the visitor chooses.
 */
export function ThemeToggle({ initialDark }: { initialDark: boolean }) {
  // On the client, read the page itself: another toggle (header or menu) may have changed it.
  const [dark, setDark] = useState(() => (typeof document === "undefined" ? initialDark : document.documentElement.classList.contains("dark")));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    document.cookie = `${THEME_COOKIE}=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
    setDark(next);
  };
  return (
    <Button type="button" variant="ghost" size="icon" className="size-10 rounded-full" aria-pressed={dark} aria-label="Dark mode" onClick={toggle}>
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
