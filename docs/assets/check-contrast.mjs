#!/usr/bin/env node
/**
 * Contrast verifier for the token palette in docs/05-DESIGN-SYSTEM.md.
 * Run: node docs/assets/check-contrast.mjs
 * Moves to packages/tokens/scripts/ in Phase 0 and runs as part of `pnpm verify`.
 */
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const lum = (hex) => {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

// [label, foreground, background, minimum]  — 4.5 text, 3.0 UI boundary/large text
const CHECKS = [
  ['primary-600 text on white',            '#2E4BD8', '#FFFFFF', 4.5],
  ['white on primary-600 (primary button)','#FFFFFF', '#2E4BD8', 4.5],
  ['primary-700 on white',                 '#243BAE', '#FFFFFF', 4.5],
  ['primary-700 on primary-50',            '#243BAE', '#F0F5FF', 4.5],
  ['focus ring primary-500 on white',      '#4569EF', '#FFFFFF', 3.0],
  ['near-black on accent fill',            '#111827', '#F59E0B', 4.5],
  ['accent-text on white',                 '#B45309', '#FFFFFF', 4.5],
  ['accent-text on accent-50',             '#B45309', '#FFFBEB', 4.5],
  ['body text neutral-700 on neutral-50',  '#334155', '#F8FAFC', 4.5],
  ['secondary neutral-600 on white',       '#475569', '#FFFFFF', 4.5],
  ['input border neutral-500 on white',    '#64748B', '#FFFFFF', 3.0],
  ['success text on white',                '#15803D', '#FFFFFF', 4.5],
  ['success text on success bg',           '#15803D', '#ECFDF5', 4.5],
  ['warning text on warning bg',           '#B45309', '#FFFBEB', 4.5],
  ['danger text on danger bg',             '#B91C1C', '#FEF2F2', 4.5],
  ['white on danger fill',                 '#FFFFFF', '#DC2626', 4.5],
  ['info text on white',                   '#0369A1', '#FFFFFF', 4.5],
  // dark theme
  ['dark text-primary on base',            '#E6EBF5', '#0B1020', 4.5],
  ['dark text-secondary on surface',       '#9AA6C0', '#131A2E', 4.5],
  ['dark border-interactive on surface',   '#6B7BA3', '#131A2E', 3.0],
  ['dark focus on surface',                '#6C90FB', '#131A2E', 3.0],
  ['white on dark action',                 '#FFFFFF', '#3B5BE0', 4.5],
  ['dark accent-text on base',             '#FFCA4D', '#0B1020', 4.5],
  ['dark success on base',                 '#4ADE80', '#0B1020', 4.5],
  ['dark danger on base',                  '#F87171', '#0B1020', 4.5],
]

// Pairings that MUST fail — documented prohibitions, asserted so nobody "fixes" the docs
// by starting to use them.
const PROHIBITED = [
  ['accent fill as text on white', '#F59E0B', '#FFFFFF', 4.5],
  ['neutral-300 as an input border', '#CBD5E1', '#FFFFFF', 3.0],
  ['neutral-400 as an input border', '#94A3B8', '#FFFFFF', 3.0],
]

let failed = 0
for (const [label, fg, bg, min] of CHECKS) {
  const r = ratio(fg, bg)
  const ok = r >= min
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(6)}:1  (min ${min})  ${label}`)
}
console.log('\nDocumented prohibitions (these are expected to be below the minimum):')
for (const [label, fg, bg, min] of PROHIBITED) {
  const r = ratio(fg, bg)
  if (r >= min) { failed++; console.log(`UNEXPECTED PASS  ${r.toFixed(2)}:1  ${label}`) }
  else console.log(`  confirmed unsafe  ${r.toFixed(2).padStart(6)}:1  ${label}`)
}
console.log(failed ? `\n${failed} contrast check(s) failed.` : '\nAll contrast checks passed.')
process.exit(failed ? 1 : 0)
