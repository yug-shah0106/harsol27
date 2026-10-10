import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Reads the real tokens from globals.css, so a palette edit that breaks WCAG AA fails CI.
const css = readFileSync(path.join(import.meta.dirname, "../app/globals.css"), "utf8");
const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
const tokens = Object.fromEntries([...root.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const token = (name: string) => {
  const value = tokens[name];
  if (!value) throw new Error(`token --${name} missing from :root`);
  return value;
};

// [text, background, minimum ratio]: 4.5 for normal text, 3 for UI component boundaries.
const pairs: [string, string, number][] = [
  ["foreground", "background", 4.5],
  ["foreground", "card", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["primary", "background", 4.5], // links
  ["primary", "card", 4.5],
  ["secondary-foreground", "secondary", 4.5],
  ["muted-foreground", "background", 4.5],
  ["muted-foreground", "card", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["accent-foreground", "accent", 4.5],
  ["primary", "accent", 4.5], // olive words on blush (the call to action)
  ["primary", "secondary", 4.5], // olive words on stone (the marquee, the footer)
  ["primary", "sage", 4.5], // olive headings on the sage section
  ["muted-foreground", "sage", 4.5],
  ["foreground", "sage", 4.5],
  ["destructive", "background", 4.5],
  ["destructive", "card", 4.5],
  ["success", "card", 4.5],
  ["input", "background", 3],
  ["input", "card", 3],
  ["ring", "background", 3],
  ["ring", "card", 3],
];

describe("brand palette meets WCAG 2.1 AA", () => {
  it.each(pairs)("--%s on --%s ≥ %s:1", (fg, bg, min) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(min);
  });
});
