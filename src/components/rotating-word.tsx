"use client";

import { useEffect, useState } from "react";

/**
 * One word at a time from `words`, each sliding up into place every 2.2 seconds. Decorative: hide it
 * from screen readers (aria-hidden) and give them the whole sentence instead. With reduced motion it
 * stays on the first word. The words share one grid cell, so the line never changes width.
 */
export function RotatingWord({ words, className }: { words: readonly string[]; className?: string }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || words.length < 2) return;
    const id = setInterval(() => setCurrent((w) => (w + 1) % words.length), 2200);
    return () => clearInterval(id);
  }, [words.length]);

  return (
    <span className={`rotator ${className ?? ""}`}>
      {words.map((word, i) => (
        <span key={word} data-state={i === current ? "current" : i === (current + words.length - 1) % words.length ? "previous" : "next"}>
          {word}
        </span>
      ))}
    </span>
  );
}
