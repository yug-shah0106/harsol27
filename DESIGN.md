---
version: alpha
name: Harsol27
description: Harsol27 is a B2B marketplace that puts buyers in direct touch with approved Gujarati manufacturers, wholesalers and traders. The look is light, sober and premium, with an editorial home page in the spirit of lenis.dev — a linen page ({colors.background}), soft stone, sage and blush sections, olive ({colors.primary}) as the one strong colour for actions and headings, large elegant serif headings with italics for emphasis, no dark backgrounds — and a signature moment: Uttarayan kites flying behind the home page headline.

colors:
  background: "#faf7f2"
  foreground: "#2e2b27"
  card: "#ffffff"
  popover: "#ffffff"
  primary: "#56664f"
  on-primary: "#ffffff"
  secondary: "#ede8e0"
  muted: "#ede8e0"
  muted-foreground: "#645e56"
  accent: "#f1d9ce"
  on-accent: "#2e2b27"
  sage: "#dfe6d8"
  destructive: "#b42318"
  success: "#067647"
  border: "#e4ddd2"
  input: "#8a8378"
  ring: "#56664f"
  kite-champagne: "#e3c9a0"
  kite-clay: "#c98b76"
  kite-sage: "#b9c6b0"
  kite-ivory: "#fbf8f3"
  sky-top: "#e6ece2"
  sky-mid: "#f1f1ea"
  sky-horizon: "#faf7f2"
  roofs-back: "#dde3d6"
  roofs-front: "#c3cdb9"
typography:
  family: "Plus Jakarta Sans (self-hosted by next/font), fallback ui-sans-serif, system-ui, sans-serif"
  display-family: "Instrument Serif (self-hosted by next/font), one weight (400) plus italic; headings and the wordmark only"
  hero-display: { family: display, size: "clamp(44px, 19px + 6vw, 108px)", weight: 400, lineHeight: 0.95, letterSpacing: "-0.025em" }
  page-title: { family: display, size: "60px (36px on phones)", weight: 400, lineHeight: 1.05, letterSpacing: "-0.025em" }
  section-heading: { family: display, size: "72px (48px on phones)", weight: 400, lineHeight: 1.0, letterSpacing: "-0.025em" }
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
  button-pill: { note: "marketing pages only: the same buttons with rounded {rounded.full}" }
  input: { background: "{colors.card}", border: "1px {colors.input}", height: "40px", padding: "0 12px", rounded: "{rounded.lg}" }
  card: { background: "{colors.card}", border: "1px {colors.border}", rounded: "{rounded.xl}", padding: "20px" }
  eyebrow-pill: { background: "white at 70%", text: "{colors.primary}", border: "1px {colors.primary} at 25%", rounded: "{rounded.full}", padding: "4px 14px" }
  stacked-card: { background: "{colors.card}", border: "1px {colors.border}", rounded: "16px", padding: "28px (36px from 640px)", shadow: "xl, olive at 10%" }
---

# Harsol27 design

> This file describes the design that is in the code today. The code is the source of truth:
> colours live in `src/app/globals.css` (`:root`), components in `src/components/ui/`. If this file
> and the code disagree, the code wins — then fix this file. Change the design deliberately, not by drift.

## 1. Visual theme & atmosphere

Harsol27 should feel like a trustworthy, premium business directory made with care. The home page is
editorial, after lenis.dev: large type, full-width sections and scroll-driven motion, but in light,
sober colours. Buyers are owners and purchase managers of Gujarati businesses; many browse on a phone.
So the design is:

- **Light, always.** A linen page ({colors.background}), white cards, and soft stone, sage and blush
  sections. No dark backgrounds anywhere.
- **One strong colour.** Olive ({colors.primary}) for buttons, links, focus and headings. Everything else is soft.
- **One soft highlight.** Blush ({colors.accent}): the headline underline, the row hover, the call-to-action section.
- **Elegant type.** Large serif headings (Instrument Serif), with italics for emphasis ("*call them.*"),
  over a clean sans for everything you read and use.
- **One signature moment.** On the home page, kites fly at Uttarayan over a city skyline, behind the
  headline (a live 3D scene, with a static picture first and as the fallback).
- **Editorial where it sells, calm where you work.** Home and marketing pages: serif headings,
  alternating full-width sections, a drifting marquee. Forms, search results, product and seller pages,
  and the dashboards stay plain.
- **Alive, not busy.** Content rises in as you reach it, headings blur into focus, cards catch a soft
  light under the mouse, main buttons lean toward it, and scrolling is smooth (see 6a. Motion).
- **Generous space.** Plenty of room, short plain-English copy ("Find the right supplier. Then just
  call them."), hairlines rather than boxes, very little shadow.

## 2. Colour palette & roles

| Token | Hex | Role |
|---|---|---|
| `background` | #faf7f2 | Linen page |
| `foreground` | #2e2b27 | Body text, a soft charcoal (13.2:1 on the page) |
| `card` / `popover` | #ffffff | Cards, form panels, header, dropdown lists |
| `primary` | #56664f | Olive: buttons, links, focus ring, headings, wordmark "Harsol" (5.8:1 on the page) |
| `on-primary` | #ffffff | Text on olive (6.2:1) |
| `secondary` / `muted` | #ede8e0 | Stone: secondary buttons, highlighted list option, photo placeholders, the marquee and the footer |
| `muted-foreground` | #645e56 | Secondary text (6.0:1 on the page, 5.3:1 on stone, 5.0:1 on sage, 4.8:1 on blush) |
| `accent` | #f1d9ce | Blush: the headline underline, the industry rows' hover, the call-to-action section. **Behind text only, never text** |
| `on-accent` | #2e2b27 | Text on blush (10.4:1); olive headings on blush are 4.6:1 |
| `sage` | #dfe6d8 | A soft section background (Why Harsol27). Olive on it is 4.8:1 |
| `border` | #e4ddd2 | Decorative hairlines and card outlines |
| `input` | #8a8378 | Form-control borders and the scrollbar thumb (≥ 3:1, as WCAG requires for controls) |
| `destructive` | #b42318 | Errors — always with an icon or words, never colour alone |
| `success` | #067647 | Confirmations |

**Hero art** (home only; `src/lib/kites.ts` and `.kite-sky` in `globals.css`): a soft morning sky, pale
sage #e6ece2 → #f1f1ea → linen, with a blush sun; rooftops in pale sage #dde3d6 (back) and #c3cdb9
(front). Kites in olive, champagne #e3c9a0, clay #c98b76, sage #b9c6b0, ivory #fbf8f3 and blush. The
kite-only colours are not used anywhere else.

Contrast is enforced: `src/lib/brand-contrast.test.ts` reads `:root` and fails CI if a pairing drops below
WCAG AA (4.5:1 text, 3:1 controls and focus). Light theme only: `dark:` utilities apply only under a
`.dark` class, which the site never sets.

## 3. Typography

Two families, both self-hosted by `next/font` (no request to Google from the visitor):
**Plus Jakarta Sans** for everything you read and use, and **Instrument Serif** (`font-display`) for
headings and the wordmark. The serif has one weight: never add `font-bold` to it (the browser would fake
a bold). Use italics for emphasis. Display headings are olive. The offline page uses the system font,
because the web fonts may not be cached.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Hero headline | 44px → 108px (`clamp`) | 400 | Serif, `leading-[0.95]`, `text-balance`, "call them." in italic over a blush underline; home page only |
| Giant lines | up to 104–184px (`clamp`) | 400 | Serif: the home page's step titles and "Sell everything on *Harsol27*" |
| Page title (h1) | 60px (36px phones) | 400 | Serif, olive, on browsing and marketing pages. Product and seller names, forms and dashboards keep Jakarta 30px/800 |
| Section heading (h2) | 72px (48px phones) | 400 | Serif, olive, `leading-none` (home page) |
| Statement | 72px (36px phones) | 400 | Serif, `leading-[1.1]`; words light up on scroll |
| Small numbers ("01") | 20px | 400 | Serif italic |
| Eyebrow | 12px | 600 | Jakarta, uppercase, `tracking-[0.18em]` |
| Admin page title | 24px | 700 | |
| Card heading | 18px | 600 | |
| Lead paragraph | 18px | 400 | `muted-foreground` |
| Body | 16px | 400 | |
| Small text, nav links | 14px | 400–500 | Inputs drop to 14px from 768px up (16px on phones stops iOS zoom) |
| Badge | 12px | 500 | |

Wordmark: "Harsol" in olive + "*27*" in charcoal italic, Instrument Serif 27px (24px phones), tight tracking.

## 4. Component stylings

Use the components in `src/components/ui/` rather than restyling raw elements.

- **Button** (`button.tsx`): radius 10px, 14px/500 label.
  - Default: olive, 40px tall; a little darker on hover (a lighter hover would drop the white text below 4.5:1).
  - `lg`: 48px tall, 16px label.
  - `outline`: linen with a hairline border.
  - `secondary`: stone.
  - `ghost` and `link` (olive text, underline on hover).
  - Every button gets the 3px olive focus ring, and moves down 1px when pressed.
- **Input / Textarea**: white, 1px `input` border, 40px tall, radius 10px. Invalid fields get a red
  border and ring plus an error message linked with `aria-describedby`.
- **Dropdown** (`dropdown.tsx`): use this for every choice from a list. Never use a native `<select>`.
  - Closed, it looks like an Input, with a chevron that flips when open.
  - The list is a white popover: radius 10px, `shadow-lg`, 4px padding, up to 288px tall, scrolling inside.
  - Options are 14px. The highlighted one has a stone background; the chosen one is semibold with an olive check.
  - It opens upwards when there's no room below.
- **Card** (a plain bordered `div`, not the shadcn `<Card>`): white, 1px `border`, radius 14px, padding 16–20px
  (form panels 20px, 32px from 640px up).
  - Clickable cards turn the border olive on hover.
  - Product cards add a 4:3 photo on stone, and the title underlines on hover.
- **Industry tile**: white, bordered, radius 10px, 12px × 16px padding, medium weight, olive border on hover.
- **Eyebrow pill**: translucent white, a thin olive outline, olive 12px uppercase letter-spaced text. At most one per page.
- **Pill buttons**: on the home and marketing pages, buttons and the hero search are fully rounded
  (`rounded-full`). Forms and tools keep the 10px radius.
- **Marquee band**: stone, between hairlines, serif italic olive words ("Manufacturers · Wholesalers ·
  Traders") with tiny olive diamonds, drifting sideways. Decorative (`aria-hidden`).
- **Stacked cards** (Why Harsol27, on sage): white cards with a hairline and a soft olive-tinted shadow,
  radius 16px, each tilted 1° and sticking a little lower than the last, so they pile up as you scroll.
  An italic serif number, an olive serif title, muted text.
- **Numbered steps** ("How it works"): an italic serif "01", then the step title as a giant olive serif
  line sliding in from alternating sides, over a hairline that draws itself in olive.
- **Numbered rows**: the home page's industries. A small number, the name in serif and an arrow, with a
  hairline under each; blush fills the row from below on hover or focus.
- **Call-to-action section**: blush, a giant two-line serif heading ("Sell everything on" in charcoal, "*Harsol27*"
  in olive italic), then a hairline, a line of text and an olive pill "Get started".
- **Badge** (`badge.tsx`): 20px tall, fully rounded, 12px. Default (olive) for "new", secondary (stone) for other statuses.
- **Table** (`table.tsx`): sits in a ScrollArea that scrolls sideways on phones. Pass `scrollLabel`
  so keyboard users can reach it.
- **ScrollArea** (`scroll-area.tsx`): use it for anything that scrolls inside a page.
  - Thin brand scrollbar: 10px, `input`-coloured thumb, olive on hover.
  - Soft edge shadows while there is more to see.
  - Set `--scroll-bg` to the colour behind it.
- **Header**: white, bottom hairline, 1152px container.
  - Wordmark on the left.
  - 14px/500 text links that underline on hover, then an olive pill "Get started" button.
- **Footer**: stone, a top hairline, full width with the page gutters (16px, 24px, 40px from 1024px),
  the copyright in `muted-foreground`, then text links.
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
  - home sections: 96px, 128px from 640px; full-width, alternating linen, stone, sage, white and blush;
  - hero: at least the screen's height from 1024px.
- Hero: a full-width sky with the skyline along the bottom. The headline spans the width; the paragraph,
  search and links sit under it on the left. From 1024px the kites fly on the right, behind the headline,
  faded towards it so the words stay clear. Below 1024px the kites come after the copy.
- Grids:
  - industries: 2 → 3 → 4 columns;
  - products: 1 → 2 → 3 → 4 columns;
  - search filters: 2 → 5 columns.
- Gaps are 12–16px.

## 6. Depth & elevation

The site is almost flat: surfaces are separated by colour (linen page, white cards, soft sections) and
1px hairlines. Cards lift 2–4px on hover and catch the spotlight; product photos zoom 5% inside their frame.

- **Shadows:** only floating layers get one. Dropdown lists use `shadow-lg`; the stacked cards, which
  pile on each other, use a soft olive-tinted `shadow-xl`.
- **Scrolling:** scroll areas show soft inner shadows at an edge only while there is more content that way.
- **Corners:** the stacked cards use 16px; everything else uses 6–14px, or fully round pills.

## 6a. Motion

Motion is built on GSAP, ScrollTrigger and Lenis smooth scrolling. All of it is in
`src/components/motion.tsx`. Pages opt in with data attributes, so they stay plain HTML.

| Attribute | Effect |
|---|---|
| `data-reveal` | Rises 32px and fades in when scrolled to, 0.8s `power3.out`. Items arriving together stagger 0.08s. Use on cards, list items and sections below the fold. |
| `data-blur-text` (via `<BlurText>`) | Heading words go from blurred and above to sharp, one after another. Use on section headings, never the page's main headline. |
| `data-count` (via `<CountUp>`) | A number counts up from 0 when it appears. |
| `data-spotlight` + `.spotlight` | A soft olive light, plus a brighter rim, follows the mouse over a card. Use on clickable cards. |
| `data-magnet` | Leans a quarter of the way toward a mouse within 48px. Main calls to action only: at most two per screen. |
| `data-parallax="10"` | Drifts by that percent of its height as the page scrolls past. Only the hero's kite panel. |
| `data-draw` | A line that draws itself as its section scrolls by. |
| `data-scroll-text` (via `<ScrollText>`) | A statement whose words go from faint to full while it crosses the screen (as on lenis.dev). |
| `data-slide="left"` / `"right"` | A giant line slides in from that side as it scrolls up the screen (finishing by the bottom of the page). Its section needs `overflow-x-clip`. |
| `data-stack` | On a list of CSS-sticky cards: each card sinks back to 92% as the next one slides over it. |
| `data-marquee` | A track holding its content twice drifts sideways for ever; scrolling speeds it up, scrolling back turns it round. |

BlurText, CountUp, SpotlightCard and Magnet are adapted from React Bits (reactbits.dev), rebuilt on GSAP.

Rules:
- **Nothing on screen at load waits for JavaScript.** The first view enters with CSS (`tw-animate-css`:
  `animate-in fade-in slide-in-from-bottom-*`). The main headline only slides and never fades, because it
  is the page's largest paint. GSAP loads afterwards, in its own chunks, and only animates what is below the fold.
- **Reduced motion means no motion.** Smooth scrolling and every animation are off, and CSS entrances
  finish at once. Mouse effects also need a real mouse (hover and a fine pointer).
- **Only transform, opacity and filter are animated.** Nothing shifts the layout. Hidden items stay
  focusable, and show themselves when focused.
- **Durations:** 150ms for small interface responses (dropdowns); 0.5–0.8s for entrances; about 1s for the hero.
  Eases: `power3.out` and `ease-out`.
- **Scroll areas inside the page keep native scrolling** (ScrollArea adds `data-lenis-prevent`).
- **Tools stay calm.** The admin and seller dashboards get no entrances, only the admin's counting numbers.

## 7. Do's and don'ts

**Do**
- Use only the tokens. No new hex values in components (the kite scene is the one exception).
- Keep olive text for things you can click or focus, and for headings.
- Write plain, short English, and say what happens next ("Our team will get in touch").
- Give every input a visible `<Label>`, and every error both words and an icon.
- Keep the 3px olive focus outline visible on everything interactive.
- Respect `prefers-reduced-motion` (motion.tsx, the kites and the global CSS rule already do).
- Add motion with the data attributes above, not with one-off animation code.

**Don't**
- Don't use dark backgrounds. Sections are linen, stone, sage, white or blush.
- Don't use inline `style` attributes or `<style>` tags. The site's Content Security Policy blocks them,
  so they silently do nothing. Use Tailwind classes; arbitrary values like `fill-[#c3cdb9]` are fine.
- Don't use blush as a text colour (it is a background), or bold the serif.
- Don't add gradients, glows or decorative illustrations outside the home hero. The one exception is the
  spotlight's hover light on cards.
- Don't hide anything that is on screen at load until a script runs, and never fade the main headline.
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
- Images: product photos are 4:3 with `object-cover` on a stone placeholder. A missing photo shows an icon,
  not an empty box. Photos load lazily, except the first few on a page.

## 9. Agent prompt guide

**Quick reference:**
- Page: linen #faf7f2; soft sections: stone #ede8e0, sage #dfe6d8, blush #f1d9ce
- Cards: #ffffff with a #e4ddd2 border, radius 14px
- Text: #2e2b27, secondary #645e56
- Action, links and headings: olive #56664f
- Fonts: Plus Jakarta Sans for text; Instrument Serif (one weight, italics for emphasis) for headings and the wordmark
- No dark backgrounds
- Corners: 10px for controls, 14px for cards

**Example prompts:**
- "Build the seller's 'Edit profile' page in the Harsol27 style. Follow DESIGN.md:
  - a 576px form panel (a white card), Labels above Inputs, `Dropdown` for choices;
  - one olive primary button and an outline Cancel;
  - errors in words, linked with aria-describedby."
- "Add a 'Recent inquiries' list to the admin dashboard, matching the existing admin tiles:
  - white bordered cards with radius 14px and an olive border on hover;
  - muted 14px labels, and a Badge for status."

## Known gaps

- **Dark theme:** there is none (light only, by decision).
- **Unused components:** the shadcn `<Card>` exists but pages use plain bordered `div`s. Follow the pages.
- **Next.js error overlay:** in `pnpm dev`, its inline styles are blocked by the CSP. This doesn't affect the live site.
- **Unwritten guidelines:** there are none yet for illustrations, product photography or email design.
  Emails use plain inline-styled HTML, which email clients require.
