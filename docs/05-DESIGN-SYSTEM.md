# 05 — Design System: Colour, Theme & Components

Every contrast ratio in this document was computed against the WCAG 2.1 relative-luminance formula
and is reproducible today by running `node docs/assets/check-contrast.mjs` (all 25 checks pass; the
script moves into `packages/tokens/scripts/` in Phase 0 and joins `pnpm verify`). Where a value is unsafe, it is
labelled — those pairings are not accidental omissions, they are prohibitions.

## 1. Brand direction

The product is a **curated trade directory**, so the visual job is *trust and legibility*, not
personality. Two anchors:

- **Harbor Blue** (primary) — institutional, calm, the colour of banking and B2B software. It says
  "vetted". It is deliberately a deeper, slightly violet blue rather than the generic SaaS
  cornflower, so the portal does not look like a template.
- **Trade Gold** (accent) — warmth, commerce, and a hint of the Indian marketplace. Used sparingly:
  ratings, "verified" marks, highlights, and the one CTA per screen that matters most.

Explicitly avoided: IndiaMART/TradeIndia orange-red (looks like a clone), and pure `#000`/`#FFF`
(harsh on OLED phones, which is most of the audience).

Ratio in practice: **~70% neutral, ~25% Harbor Blue, ~5% Trade Gold.** If a screen looks colourful,
it is wrong.

## 2. Colour tokens

### 2.1 Primary — Harbor Blue

| Token | Hex | Use |
|---|---|---|
| `primary-50` | `#F0F5FF` | Tinted surfaces, selected rows, info banners |
| `primary-100` | `#DEE9FF` | Hover on tinted surface, chips |
| `primary-200` | `#C2D6FF` | Borders on tinted surfaces |
| `primary-300` | `#9BB8FF` | **Dark-mode body accent text** |
| `primary-400` | `#6C90FB` | **Dark-mode link / focus ring** |
| `primary-500` | `#4569EF` | Light-mode focus ring, gradients |
| `primary-600` | `#2E4BD8` | **Primary action fill, links** |
| `primary-700` | `#243BAE` | Hover/active on primary, headings |
| `primary-800` | `#1E3186` | Pressed state, dark header |
| `primary-900` | `#1B2A6B` | Deep surfaces |
| `primary-950` | `#121B44` | Footer, hero overlays |

Verified:

| Pair | Ratio | Verdict |
|---|---|---|
| `primary-600` text on white | **6.74:1** | AA all sizes ✅ |
| White text on `primary-600` fill | **6.74:1** | AA ✅ (this is the primary button) |
| `primary-700` on white | **9.08:1** | AAA ✅ |
| `primary-800` on white | **11.42:1** | AAA ✅ |
| `primary-700` on `primary-50` | **8.31:1** | AAA ✅ |
| `primary-500` focus ring on white | **4.65:1** | Exceeds the 3:1 UI minimum ✅ |
| `primary-300` on dark `#0B1020` | **9.64:1** | AAA ✅ |
| `primary-400` on dark `#0B1020` | **6.33:1** | AA ✅ |

### 2.2 Accent — Trade Gold

| Token | Hex | Use |
|---|---|---|
| `accent-50` | `#FFF9EB` | Highlight background |
| `accent-100` | `#FFF0C7` | |
| `accent-200` | `#FFE08A` | |
| `accent-300` | `#FFCA4D` | **Dark-mode accent text** |
| `accent-400` | `#FDB524` | Dark-mode fills |
| `accent-500` | `#F59E0B` | **Accent fill** (badges, icons, "Verified") |
| `accent-600` | `#D97706` | Hover on accent fill |
| `accent-700` | `#B45309` | **Accent text on light backgrounds** |

Verified:

| Pair | Ratio | Verdict |
|---|---|---|
| `accent-500` text on white | **2.15:1** | ❌ **Never use as text on white.** Fill and icon only. |
| Near-black `#111827` on `accent-500` fill | **8.26:1** | AAA ✅ — this is how accent buttons get labelled |
| `accent-700` text on white | **5.02:1** | AA ✅ |
| `accent-700` on `accent-50` | **4.84:1** | AA ✅ |
| `accent-300` on dark `#0B1020` | **12.45:1** | AAA ✅ |

The `accent-500`-on-white failure is the single most likely accessibility mistake in this project —
gold on white always looks fine to a designer and always fails a scan. The token file names it
`--accent-fill` rather than `--accent-text` so the wrong use reads wrong in code.

### 2.3 Neutrals

Slate, because a cool grey sits under a blue primary without muddying it.

| Token | Hex | Use |
|---|---|---|
| `neutral-0` | `#FFFFFF` | Cards, sheets |
| `neutral-50` | `#F8FAFC` | **Page background** (never pure white — reduces glare and lets cards read as cards) |
| `neutral-100` | `#F1F5F9` | Subtle fills, table stripes |
| `neutral-200` | `#E2E8F0` | **Decorative dividers** (1.23:1 — decorative only, never an interactive boundary) |
| `neutral-300` | `#CBD5E1` | Disabled borders (1.48:1 — decorative) |
| `neutral-400` | `#94A3B8` | Placeholder icons (2.56:1 — **not** an input border) |
| `neutral-500` | `#64748B` | **Input borders** (4.76:1 ✅), muted text |
| `neutral-600` | `#475569` | Secondary text — 7.58:1 AAA ✅ |
| `neutral-700` | `#334155` | Body text — 10.35:1 AAA ✅ |
| `neutral-800` | `#1E293B` | Headings |
| `neutral-900` | `#0F172A` | **Primary text** — 17.85:1 AAA ✅ |

The trap here: `neutral-300` input borders are the default in nearly every Tailwind tutorial and
they fail the 3:1 non-text contrast rule. **Input, select, checkbox and card-with-action borders use
`neutral-500`.** `neutral-200` is allowed only for purely decorative rules.

### 2.4 Semantic

| Role | Text-on-light | Fill | Tint bg | Dark-mode text | Verified |
|---|---|---|---|---|---|
| Success / Approved | `#15803D` | `#16A34A` | `#ECFDF5` | `#4ADE80` | 5.02:1 on white ✅ · 4.76:1 on tint ✅ · 10.86:1 dark ✅ |
| Warning / Pending | `#B45309` | `#F59E0B` | `#FFFBEB` | `#FBBF24` | 5.02:1 ✅ · 4.84:1 on tint ✅ · 11.34:1 dark ✅ |
| Danger / Rejected | `#B91C1C` | `#DC2626` | `#FEF2F2` | `#F87171` | 6.47:1 ✅ · 5.91:1 on tint ✅ · white-on-`#DC2626` 4.83:1 ✅ · 6.84:1 dark ✅ |
| Info / Draft | `#0369A1` | `#0284C7` | `#F0F9FF` | `#38BDF8` | 5.93:1 ✅ · 8.84:1 dark ✅ |

Status colour is **never the only signal** — every status badge carries an icon and a word
(`✓ Approved`, `⏱ Pending`, `✕ Rejected`), because ~8% of Indian male buyers have a colour vision
deficiency and the whole seller workflow is status-driven.

### 2.5 Dark mode

| Token | Hex | Note |
|---|---|---|
| `bg-base` | `#0B1020` | Deep navy, not black — softer on OLED, keeps the brand hue |
| `bg-surface` | `#131A2E` | Cards |
| `bg-surface-2` | `#1B2440` | Raised / popovers |
| `border-subtle` | `#2A3550` | Decorative only (1.42:1) |
| `border-interactive` | `#6B7BA3` | **Inputs and controls** — 4.11:1 on surface ✅ |
| `text-primary` | `#E6EBF5` | 15.84:1 on base ✅ AAA |
| `text-secondary` | `#9AA6C0` | 7.74:1 on base, 7.07:1 on surface ✅ AAA |
| `action` | `#3B5BE0` | White label at 5.59:1 ✅ |
| `focus` | `#6C90FB` | 5.78:1 on surface ✅ |

Dark mode inherits the same border trap: `#2A3550` looks like the natural input border and is
1.42:1. Use `border-interactive`.

### 2.6 Data-visualisation series

For the lead and product charts, in order. Distinguishable in both themes and under deuteranopia:

`#2E4BD8` · `#F59E0B` · `#0891B2` · `#7C3AED` · `#DB2777` · `#65A30D`

Never encode a value by colour alone in a chart: always label directly or provide a table fallback.

## 3. Token implementation

`packages/tokens/tokens.json` is the source; a build step emits `styles/tokens.css` (CSS custom
properties) and the Tailwind v4 `@theme` block. **No agent edits the generated files, and no
component contains a hex value.** A lint rule enforces it:

```js
// eslint: no raw colours outside the tokens package
'no-restricted-syntax': [
  'error',
  { selector: "Literal[value=/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/]",
    message: 'Use a design token from styles/tokens.css, not a hex literal.' },
],
```

This rule is the difference between a coherent product and forty slightly different blues, which is
what happens when several AI agents build screens in parallel.

See [`assets/tokens.css`](./assets/tokens.css) for the full generated file.

## 4. Typography

**Inter** (UI, variable) + **Inter Tight** (display headings). Both self-hosted via `next/font`,
subset to `latin` + `latin-ext`, `display: swap`. Self-hosting matters: Google Fonts adds a
third-party connection on a 4G-first audience and is a GDPR complication for free.

Numerals in tables and stat tiles use `font-variant-numeric: tabular-nums`.

| Role | Size / line-height | Weight | Notes |
|---|---|---|---|
| Display | 40/44 (mobile 32/38) | 700 | Home hero only |
| H1 | 32/40 (mobile 26/34) | 700 | |
| H2 | 24/32 | 600 | |
| H3 | 20/28 | 600 | Card titles |
| Body-lg | 17/28 | 400 | Product description |
| Body | 15/24 | 400 | **Default** |
| Body-sm | 13/20 | 400 | Meta, captions |
| Label | 13/16 | 600, +0.01em | Form labels, table headers |
| Overline | 11/16 | 700, +0.08em, uppercase | Section eyebrows |

Minimum body size on mobile is **15px** — 14px is the reflex and it is genuinely hard to read on a
mid-range phone in daylight, which is the actual usage context. Form inputs are **16px on mobile**,
because anything smaller makes iOS Safari zoom on focus, which feels broken.

## 5. Spacing, radius, elevation, motion

**Spacing** — 4px base: `1=4 · 2=8 · 3=12 · 4=16 · 5=20 · 6=24 · 8=32 · 10=40 · 12=48 · 16=64 · 20=80`.
Section padding: 24px mobile / 40px tablet / 64px desktop. Card padding 16 mobile / 20 desktop.
Content max-width 1280px; text columns cap at 72ch.

**Radius** — `sm 6 · md 10 · lg 14 · xl 20 · full 9999`. Buttons and inputs `md`; cards `lg`; modals
and sheets `xl`; avatars and chips `full`. One consistent family; nothing sharp-cornered.

**Elevation** — four levels only, all cool-tinted (`220 40% 12%`) so shadows read as shadow, not
smudge:
`xs 0 1 2 /.06` · `sm 0 2 4 /.08` · `md 0 6 16 /.10` · `lg 0 16 40 /.14`.
Cards use `xs` at rest and `sm` on hover. In dark mode, shadows are near-invisible: use
`bg-surface-2` plus a `border-subtle` line to convey elevation instead.

**Motion** — `fast 120ms` (hover/press) · `base 200ms` (dropdowns, tabs) · `slow 320ms` (sheets,
modals). Easing `cubic-bezier(.4,0,.2,1)`, entering `cubic-bezier(0,0,.2,1)`. Everything wrapped in
`@media (prefers-reduced-motion: reduce)` → duration 1ms. Never animate `width`/`height`/`top`; only
`transform` and `opacity`.

## 6. Component specifications

### 6.1 Buttons

| Variant | Light | Dark | When |
|---|---|---|---|
| **Primary** | `primary-600` fill, white text (6.74:1) → hover `primary-700` → active `primary-800` | `#3B5BE0` fill, white (5.59:1) | The one main action per view |
| **Accent** | `accent-500` fill, `#111827` text (8.26:1) → hover `accent-600` | `accent-400` fill, `#111827` | "Get seller contact" — and essentially nowhere else |
| **Secondary** | white fill, `neutral-500` border, `neutral-700` text → hover `neutral-50` | `bg-surface-2`, `border-interactive` | Alternative actions |
| **Ghost** | transparent, `primary-600` text → hover `primary-50` | transparent, `primary-300` | Tertiary, toolbars |
| **Destructive** | `#DC2626` fill, white (4.83:1) → hover `#B91C1C` | `#DC2626` fill, white | Delete, reject |

Heights 40px default / 36px small / 48px large. Mobile primary CTAs are 48px and full-width.
**Minimum touch target 44×44px everywhere** (WCAG 2.5.5) — pad small icon buttons out even when the
glyph is 20px. Loading state keeps the button's width and swaps the label for a spinner, so the
layout does not jump. Disabled = 40% opacity plus `aria-disabled`, never `disabled` alone on a
submit button (screen readers skip it and the user gets no explanation).

Focus, universally: `outline: 2px solid var(--focus); outline-offset: 2px`. Never `outline: none`
without a replacement — keyboard operation of the admin panel depends on it.

### 6.2 Inputs

44px tall (48px mobile), `neutral-500` border, `md` radius, 12px horizontal padding, 16px font on
mobile. Label above, always visible — never placeholder-as-label. Error state: `#DC2626` border +
message with an icon, wired via `aria-describedby` and `aria-invalid`. Helper text sits in the same
slot as the error so the layout does not shift when validation fires.

### 6.3 ProductCard — the most-repeated component in the app

```
┌─────────────────────────┐
│  4:3 image, blurhash    │  lazy below the fold; blurhash placeholder to hold CLS < 0.1
│  placeholder            │
├─────────────────────────┤
│ Product name (2 lines)  │  H3, clamp-2, min-height reserved for 2 lines
│ ₹1,250 /piece           │  primary-700, 600wt — omitted entirely if no price
│ MOQ 100 pieces          │  body-sm, neutral-600
│ 📍 Rajkot, Gujarat      │  body-sm, neutral-600
│ ─────────────────────── │
│ 🏢 Acme Steels          │  body-sm, neutral-700 → seller profile
└─────────────────────────┘
```
`lg` radius, `xs` shadow → `sm` on hover with a 2px lift. The whole card is one link; the seller name
is a nested link, so it needs `position: relative; z-index: 1` over the card's stretched-link
pseudo-element. Grid: 2 columns at 360px, 3 at 768px, 4 at 1280px. **2 columns on mobile, not 1** —
a directory needs to feel dense; one card per screen makes a 500-product catalogue feel empty.

### 6.4 ContactGate — the conversion moment

The single most important component. Locked state: a card with `primary-50` background, a lock
icon, the text "Seller contact details are protected", a blurred `+91 •••••••210` teaser, and a
full-width **accent** button: *Get seller contact*. Sub-label: "Free · Takes 30 seconds".

The blurred teaser matters: showing the shape of a real phone number makes the reward concrete and
measurably lifts click-through versus an abstract "unlock" label. The digits must be genuinely
absent from the DOM (`04-API-SPEC.md` §2.1) — the blur is CSS over placeholder characters, not over
real data.

Flow: tap → bottom sheet on mobile / dialog on desktop → form (name, phone, message; company and
quantity collapsed under "Add details") → OTP step with a 6-box auto-advancing input, `inputmode`
`numeric`, `autocomplete="one-time-code"` (this enables iOS SMS autofill and removes an entire step
on iPhone) → success state revealing contact with **Call**, **WhatsApp** and **Copy** buttons.

The success state must be celebratory but brief — a green check and the number, not a modal the user
has to dismiss before they can dial.

### 6.5 StatusBadge

Pill, `full` radius, 12px text, 600 weight, icon + label, tint background + semantic text colour:
`⏱ Pending` (warning), `✓ Approved` (success), `✕ Rejected` (danger), `◌ Draft` (info).

### 6.6 Dashboard shell

Desktop: 240px sidebar (`primary-950` background, white text, `accent-500` active indicator bar) +
content on `neutral-50`. Mobile: top bar with a hamburger drawer, plus a bottom tab bar on the
public site. Stat tiles: white card, `xs` shadow, label overline, 32px tabular number, delta chip,
and a tinted icon square — each tile is a link to its filtered list, which is what makes the
dashboard useful rather than decorative.

Tables become **cards** below 768px. A horizontally scrolling table on a phone is the fastest way to
make an admin panel unusable, and the admin persona is explicitly non-technical.

### 6.7 Empty, loading and error states

Every list needs all three, specified up front — this is the most commonly skipped work in
AI-generated UIs and the most visible when missed.

- **Empty** — illustration or icon, one sentence of explanation, one action. "No products yet. Add
  your first product to start receiving leads." → *Add product*.
- **Loading** — skeletons that match the real layout's dimensions, never a centred spinner on a full
  page. Skeleton shimmer respects reduced-motion.
- **Error** — what failed, whether it is retryable, and a retry button. Never a bare "Something went
  wrong".

Special case: a seller with **zero assigned categories** (SEL-10) gets a dedicated empty state
explaining that the admin has not assigned categories yet, with a contact link — not a product form
with an empty dropdown.

## 7. Layout & breakpoints

`sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Design at 360px first (the real floor for Indian
Android), then 768, then 1280.

Mobile navigation is a **bottom tab bar** — Home / Search / Categories / Account — with 56px height
plus `env(safe-area-inset-bottom)`. Thumb reach is the whole argument; a top-only nav on a 6.5" phone
puts every primary action out of reach.

## 8. Accessibility rules that are non-negotiable

1. Contrast: 4.5:1 text, 3:1 UI boundaries and icons — the tables above are the allowlist.
2. Every interactive element is reachable and operable by keyboard, with a visible focus ring.
3. Logical heading order, exactly one `h1` per page.
4. All images have `alt`; decorative ones get `alt=""`.
5. Forms: real `<label>`, errors announced via `role="alert"`, `aria-describedby` wiring.
6. Modals and sheets: focus trap, `Esc` to close, focus returns to the trigger.
7. Live regions for async results (lead submitted, product approved).
8. Never colour alone (§2.4).
9. Respect `prefers-reduced-motion`.
10. Touch targets ≥44×44px.

Enforcement: `eslint-plugin-jsx-a11y` in CI, `@axe-core/playwright` asserting zero violations on
every page in the E2E suite, and one manual keyboard-only pass of the three CUJs before launch.
Automated scans catch roughly 30–40% of real issues; the manual pass is what catches the rest.
