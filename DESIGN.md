---
version: alpha
name: Harsol27
description: Harsol27 is a B2B marketplace that puts buyers in direct touch with approved Gujarati manufacturers, wholesalers and traders. The look is warm, plain and trustworthy — a warm ivory page ({colors.background}), deep indigo ({colors.primary}) for every action, and saffron ({colors.accent}) as the one warm highlight — with a single signature moment: Uttarayan kites flying in the home page hero.

colors:
  background: "#fbf8f3"
  foreground: "#1f1a17"
  card: "#ffffff"
  popover: "#ffffff"
  primary: "#1f3a68"
  on-primary: "#ffffff"
  secondary: "#f1ebe0"
  muted: "#f1ebe0"
  muted-foreground: "#5e5650"
  accent: "#f6b44a"
  on-accent: "#1f1a17"
  destructive: "#b42318"
  success: "#067647"
  border: "#ddd5c8"
  input: "#8c8279"
  ring: "#1f3a68"
  kite-rani: "#c2185b"
  kite-leaf: "#2e7d4f"
  kite-vermilion: "#d9472b"
  sky-top: "#dce6f3"
  sky-mid: "#e9eef5"
  sky-horizon: "#f8eedd"
  roofs-back: "#d5dae4"
  roofs-front: "#aeb6c7"

typography:
  family: "Plus Jakarta Sans (self-hosted by next/font), fallback ui-sans-serif, system-ui, sans-serif"
  hero-display: { size: "48px (36px on phones)", weight: 800, lineHeight: 1.0, letterSpacing: "-0.025em" }
  page-title: { size: "30px", weight: 800, lineHeight: 1.2, letterSpacing: "-0.025em" }
  section-heading: { size: "30px (24px on phones)", weight: 700, lineHeight: 1.2, letterSpacing: "-0.025em" }
  admin-title: { size: "24px", weight: 700, lineHeight: 1.33 }
  card-heading: { size: "18px", weight: 600, lineHeight: 1.55 }
  lead: { size: "18px", weight: 400, lineHeight: 1.55, color: "{colors.muted-foreground}" }
  body: { size: "16px", weight: 400, lineHeight: 1.5 }
  body-sm: { size: "14px", weight: 400, lineHeight: 1.43 }
  label: { size: "14px", weight: 500 }
  button: { size: "14px (16px for large)", weight: 500 }
  badge: { size: "12px", weight: 500 }

rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  3xl: "22px"
  full: "9999px"

spacing:
  base: "4px"
  container: "1152px"
  container-narrow: "768px"
  container-form: "576px"
  gutter: "16px (24px from 640px)"

components:
  button-primary: { background: "{colors.primary}", text: "{colors.on-primary}", height: "40px", padding: "0 16px", rounded: "{rounded.lg}" }
  button-large: { background: "{colors.primary}", text: "{colors.on-primary}", height: "48px", padding: "0 24px", rounded: "{rounded.lg}" }
  button-outline: { background: "{colors.background}", text: "{colors.foreground}", border: "1px {colors.border}", rounded: "{rounded.lg}" }
  input: { background: "{colors.card}", border: "1px {colors.input}", height: "40px", padding: "0 12px", rounded: "{rounded.lg}" }
  card: { background: "{colors.card}", border: "1px {colors.border}", rounded: "{rounded.xl}", padding: "20px" }
  eyebrow-pill: { background: "{colors.accent}", text: "{colors.on-accent}", rounded: "{rounded.full}", padding: "4px 12px" }
---

# Harsol27 design

> This file describes the design that is in the code today. The code is the source of truth:
> colours live in `src/app/globals.css` (`:root`), components in `src/components/ui/`. If this file
> and the code disagree, the code wins — then fix this file. Change the design deliberately, not by drift.

## 1. Visual theme & atmosphere

Harsol27 should feel like a trustworthy local business directory made with care, not a flashy startup.
Buyers are owners and purchase managers of Gujarati businesses; many browse on a phone. So the design is:

- **Warm and plain.** A warm ivory page ({colors.background}) instead of cold white; white cards on top.
- **One action colour.** Deep indigo ({colors.primary}) means "you can act here": buttons, links, focus.
- **One warm highlight.** Saffron ({colors.accent}), used sparingly and always behind dark text.
- **One signature moment.** On the home page, kites fly at Uttarayan over a city skyline (a live 3D scene,
  with a static picture first and as the fallback). Nothing else on the site is decorative.
- **Calm density.** Generous spacing, short plain-English copy ("Find the right Gujarati supplier. Then just
  call them."), bordered white cards, very little shadow.

## 2. Colour palette & roles

| Token | Hex | Role |
|---|---|---|
| `background` | #fbf8f3 | Warm ivory page |
| `foreground` | #1f1a17 | Body text (16.3:1 on the page) |
| `card` / `popover` | #ffffff | Cards, form panels, header, footer, dropdown lists |
| `primary` | #1f3a68 | Indigo: buttons, links, focus ring, wordmark "Harsol" (10.6:1 on the page) |
| `on-primary` | #ffffff | Text on indigo (11.3:1) |
| `secondary` / `muted` | #f1ebe0 | Sand: secondary buttons, highlighted list option, photo placeholders |
| `muted-foreground` | #5e5650 | Secondary text (6.8:1 on the page, 6.1:1 on sand) |
| `accent` | #f6b44a | Saffron: eyebrow pill, the hero's sun. **Background only — never text** (1.7:1 as text) |
| `on-accent` | #1f1a17 | Text on saffron (9.5:1) |
| `border` | #ddd5c8 | Decorative dividers and card outlines |
| `input` | #8c8279 | Form-control borders and the scrollbar thumb (≥ 3:1, as WCAG requires for controls) |
| `destructive` | #b42318 | Errors — always with an icon or words, never colour alone |
| `success` | #067647 | Confirmations |

**Kite palette** (home hero only, `src/lib/kites.ts`): indigo, saffron, ivory, rani pink #c2185b,
leaf green #2e7d4f, vermilion #d9472b. Sky gradient #dce6f3 → #e9eef5 → #f8eedd with a soft saffron sun;
skyline roofs #d5dae4 (back) and #aeb6c7 (front). These colours are not used anywhere else.

Contrast is enforced: `src/lib/brand-contrast.test.ts` reads `:root` and fails CI if a pairing drops below
WCAG AA (4.5:1 text, 3:1 controls and focus). Light theme only: `dark:` utilities apply only under a
`.dark` class, which the site never sets.

## 3. Typography

One family: **Plus Jakarta Sans**, self-hosted by `next/font` (no request to Google from the visitor).
The offline page uses the system font, because the web font may not be cached.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Hero headline | 48px (36px phones) | 800 | `tracking-tight`, `text-balance`; home page only |
| Page title (h1) | 30px | 800 | `tracking-tight` |
| Section heading (h2) | 30px (24px phones) | 700 | `tracking-tight` |
| Admin page title | 24px | 700 | |
| Card / step heading | 18px | 600 | |
| Lead paragraph | 18px | 400 | `muted-foreground` |
| Body | 16px | 400 | |
| Small text, nav links | 14px | 400–500 | Inputs drop to 14px from 768px up (16px on phones stops iOS zoom) |
| Badge | 12px | 500 | |

Wordmark: "Harsol" in indigo + "27" in foreground, 20px, weight 800, tight tracking.

## 4. Component stylings

Use the components in `src/components/ui/` rather than restyling raw elements.

- **Button** (`button.tsx`): radius 10px, 14px/500 label.
  - Default: indigo, 40px tall.
  - `lg`: 48px tall, 16px label.
  - `outline`: ivory with a hairline border.
  - `secondary`: sand.
  - `ghost` and `link` (indigo text, underline on hover).
  - Every button gets the 3px indigo focus ring, and moves down 1px when pressed.
- **Input / Textarea**: white, 1px `input` border, 40px tall, radius 10px. Invalid fields get a red
  border and ring plus an error message linked with `aria-describedby`.
- **Dropdown** (`dropdown.tsx`): use this for every choice from a list. Never use a native `<select>`.
  - Closed, it looks like an Input, with a chevron that flips when open.
  - The list is a white popover: radius 10px, `shadow-lg`, 4px padding, up to 288px tall, scrolling inside.
  - Options are 14px. The highlighted one has a sand background; the chosen one is semibold with an indigo check.
  - It opens upwards when there's no room below.
- **Card** (a plain bordered `div`, not the shadcn `<Card>`): white, 1px `border`, radius 14px, padding 16–20px
  (form panels 20px, 32px from 640px up).
  - Clickable cards turn the border indigo on hover.
  - Product cards add a 4:3 photo on sand, and the title underlines on hover.
- **Industry tile**: white, bordered, radius 10px, 12px × 16px padding, medium weight, indigo border on hover.
- **Eyebrow pill**: saffron background, dark 14px semibold text, fully rounded. At most one per page.
- **Numbered steps**: 40px indigo circles with white numerals.
- **Call-to-action band**: indigo block, radius 14px, white text, a `secondary` (sand) button.
- **Badge** (`badge.tsx`): 20px tall, fully rounded, 12px. Default (indigo) for "new", secondary (sand) for other statuses.
- **Table** (`table.tsx`): sits in a ScrollArea that scrolls sideways on phones. Pass `scrollLabel`
  so keyboard users can reach it.
- **ScrollArea** (`scroll-area.tsx`): use it for anything that scrolls inside a page.
  - Thin brand scrollbar: 10px, `input`-coloured thumb, indigo on hover.
  - Soft edge shadows while there is more to see.
  - Set `--scroll-bg` to the colour behind it.
- **Header**: white, bottom hairline, 1152px container.
  - Wordmark on the left.
  - 14px/500 text links that underline on hover, then an indigo "Get started" button.
- **Footer**: white, top hairline, muted copyright, text links.
- **Admin and seller tabs**: one horizontal row that scrolls sideways on phones.
- **Icons**: `lucide-react`, 16px (`size-4`), `aria-hidden`, always next to a text label.

## 5. Layout principles

- Tailwind's 4px spacing scale.
- Containers:
  - 1152px (`max-w-6xl`) for public pages;
  - 768px (`max-w-3xl`) for seller pages;
  - 576px (`max-w-xl`) for single forms.
- Gutters: 16px on phones, 24px from 640px.
- Vertical rhythm:
  - pages: 40–48px top and bottom;
  - home sections: 56–64px;
  - hero: 48px, rising to 80px from 640px.
- Hero: copy on the left (wider column), kites on the right from 1024px. Below that it stacks, kites second.
- Grids:
  - industries: 2 → 3 → 4 columns;
  - products: 1 → 2 → 3 → 4 columns;
  - search filters: 2 → 5 columns.
- Gaps are 12–16px.

## 6. Depth & elevation

The site is almost flat: surfaces are separated by colour (ivory page, white cards) and 1px hairlines.

- **Shadows:** only floating layers get one. Dropdown lists use `shadow-lg`.
- **Scrolling:** scroll areas show soft inner shadows at an edge only while there is more content that way.
- **Corners:** the kite panel is the only element with a 22px radius; everything else uses 6–14px.

## 7. Do's and don'ts

**Do**
- Use only the tokens. No new hex values in components (the kite scene is the one exception).
- Keep indigo for things you can click or focus.
- Write plain, short English, and say what happens next ("Our team will get in touch").
- Give every input a visible `<Label>`, and every error both words and an icon.
- Keep the 3px indigo focus outline visible on everything interactive.
- Respect `prefers-reduced-motion` (the kites and transitions already do).

**Don't**
- Don't use inline `style` attributes or `<style>` tags. The site's Content Security Policy blocks them,
  so they silently do nothing. Use Tailwind classes; arbitrary values like `fill-[#aeb6c7]` are fine.
- Don't put saffron behind white text, or use it as a text colour.
- Don't add gradients, glows or decorative illustrations outside the home hero.
- Don't use native `<select>`. Use `Dropdown`.
- Don't use colour alone to show status or errors.
- Don't add a dark theme ad hoc. It needs its own token set and contrast checks first.

## 8. Responsive behaviour

- Breakpoints (Tailwind defaults): 640px (`sm`), 768px (`md`), 1024px (`lg`), 1280px (`xl`). Design phone-first.
- Touch targets: controls are at least 40px tall, and primary and hero actions are 48px.
- Collapsing:
  - the header hides "About" below 640px;
  - grids drop columns;
  - admin and seller tabs, and tables, scroll sideways rather than wrap;
  - the hero stacks.
- Images: product photos are 4:3 with `object-cover` on a sand placeholder. A missing photo shows an icon,
  not an empty box. Photos load lazily, except the first few on a page.

## 9. Agent prompt guide

**Quick reference:**
- Page: #fbf8f3
- Cards: #ffffff with a #ddd5c8 border, radius 14px
- Text: #1f1a17, secondary #5e5650
- Action: indigo #1f3a68
- Highlight: saffron #f6b44a, behind dark text only
- Font: Plus Jakarta Sans; headings 700–800 with tight tracking
- Corners: 10px for controls, 14px for cards

**Example prompts:**
- "Build the seller's 'Edit profile' page in the Harsol27 style. Follow DESIGN.md:
  - a 576px form panel (a white card), Labels above Inputs, `Dropdown` for choices;
  - one indigo primary button and an outline Cancel;
  - errors in words, linked with aria-describedby."
- "Add a 'Recent inquiries' list to the admin dashboard, matching the existing admin tiles:
  - white bordered cards with radius 14px and an indigo border on hover;
  - muted 14px labels, and a Badge for status."

## Known gaps

- **Dark theme:** there is none (light only, by decision).
- **Unused components:** the shadcn `<Card>` exists but pages use plain bordered `div`s. Follow the pages.
- **Next.js error overlay:** in `pnpm dev`, its inline styles are blocked by the CSP. This doesn't affect the live site.
- **Unwritten guidelines:** there are none yet for illustrations, product photography or email design.
  Emails use plain inline-styled HTML, which email clients require.
