---
version: alpha
name: Harsol27
description: Harsol27 is a B2B marketplace that puts buyers in direct touch with approved Gujarati manufacturers, wholesalers and traders. The theme is Marigold (chosen by the client, 2026-10-19) — a Gujarati festival in daylight, light and warm, never dark — a cream page ({colors.background}), turmeric, leaf and marigold surfaces, kumkum red ({colors.primary}) as the one strong colour for actions and headings, a soft serif (Fraunces) for headings with italics for emphasis, Gujarati beside English, and festival decoration that moves: a toran strung across the top of pages and a rangoli that draws itself and turns.

colors:
  background: "#fff9ef"
  foreground: "#3a2418"
  card: "#ffffff"
  popover: "#ffffff"
  primary: "#9c2f28"
  on-primary: "#ffffff"
  secondary: "#fbecd6"
  muted: "#fbecd6"
  muted-foreground: "#6b5141"
  accent: "#ffd27a"
  on-accent: "#3a2418"
  sage: "#e3f0dc"
  destructive: "#b42318"
  success: "#067647"
  border: "#f0dcc0"
  input: "#977d6b"
  ring: "#9c2f28"
  festival-gold: "#f2a20c"
  festival-turmeric: "#f7c548"
  festival-leaf: "#3f7d4e"
typography:
  family: "Hind Vadodara (self-hosted by next/font, Latin and Gujarati), then Hind (Devanagari, for Hindi), weights 400–700, fallback ui-sans-serif, system-ui, sans-serif"
  display-family: "Fraunces (self-hosted by next/font), variable, with its SOFT and WONK axes on (the soft, slightly wonky cut) plus italic; headings and the wordmark only"
  hero-display: { family: display, size: "clamp(46px, 19px + 6.4vw, 112px)", weight: 400, lineHeight: 0.96, letterSpacing: "-0.025em" }
  page-title: { family: display, size: "60px (36px on phones)", weight: 400, lineHeight: 1.05, letterSpacing: "-0.025em" }
  section-heading: { family: display, size: "60px (48px on phones)", weight: 400, lineHeight: 1.0, letterSpacing: "-0.025em" }
  admin-title: { size: "24px", weight: 700, lineHeight: 1.33 }
  card-heading: { size: "18px", weight: 600, lineHeight: 1.55 }
  lead: { size: "18px", weight: 400, lineHeight: 1.55, color: "{colors.muted-foreground}" }
  body: { size: "16px", weight: 400, lineHeight: 1.5 }
  body-sm: { size: "14px", weight: 400, lineHeight: 1.43 }
  label: { size: "14px", weight: 500 }
  button: { size: "14px (16px for large)", weight: 500 }
  badge: { size: "12px", weight: 500 }

rounded:
  sm: "10px"
  md: "13px"
  lg: "16px"
  xl: "22px"
  3xl: "35px"
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
  button-pill: { note: "marketing pages and the festival pages: the same buttons with rounded {rounded.full}" }
  input: { background: "{colors.card}", border: "1px {colors.input}", height: "40px", padding: "0 12px", rounded: "{rounded.lg}" }
  card: { background: "{colors.card}", border: "1px {colors.border}", rounded: "{rounded.xl}", padding: "20px" }
  arch-card: { background: "a kumkum, marigold or leaf wash", rounded: "full top, 28px bottom", padding: "12px 12px 36px", illustration: "4:3 inline SVG in the arch's round top, festival colours", shadow: "kumkum-tinted" }
  ticket: { stub: "{colors.primary}", body: "{colors.card}", notches: "16px half-circles at the perforation", rounded: "20px" }
---

# Harsol27 design

> This file describes the design that is in the code today. The code is the source of truth:
> colours live in `src/app/globals.css` (`:root`), components in `src/components/ui/` and
> `src/components/festive.tsx`. If this file and the code disagree, the code wins — then fix this file.
> Change the design deliberately, not by drift.

## 1. Visual theme & atmosphere

**Marigold**, chosen by the client on 19 October 2026: Harsol27 should feel like a Gujarati festival in
daylight — warm, welcoming and proud of where it comes from — while staying a trustworthy business
directory. Buyers and sellers are owners and purchase managers of Gujarati businesses; many browse on a
phone, and many read Gujarati. So the design is:

- **Light and warm.** A cream page ({colors.background}), white cards, and turmeric, leaf and marigold
  surfaces; no dark sections. Dark mode exists only as the visitor's choice (the header's moon button):
  the same festival by lamplight.
- **One strong colour.** Kumkum red ({colors.primary}) for buttons, links, focus and headings.
- **One warm highlight.** Marigold ({colors.accent}): pills, the offer, highlighted rows. Behind text only.
- **Festival decoration that moves.** A toran (a string of flags) across the top of every page, swaying;
  on the home page, a rangoli that draws itself and turns as you scroll, jharokha arches, diyas
  that light up, a ticket for the offer, floating marigold petals. Gold #f2a20c is for decoration only.
- **Three languages** (client, 2026-10-24): every public page reads in English, Hindi or Gujarati, as the
  visitor chooses (the header's language button, or the popup on their first visit; a cookie remembers it,
  and the address stays the same). The admin stays English. In English, Gujarati lines sit beside the
  English ones ("ટૂંક સમયમાં આવી રહ્યું છે"); in Hindi and Gujarati the page's own script takes those
  places. All texts live in `src/i18n/` (en.ts names every key; hi.ts and gu.ts must supply each one;
  Terms and Privacy are `translations.tsx` beside each page).
- **Soft serif headings.** Fraunces in its soft, slightly wonky cut, with italics for emphasis ("*take
  off*" over a hand-drawn marigold underline), over Hind Vadodara for everything you read and use.
- **Festive where it welcomes, calm where you work.** The home page is the full festival; forms,
  Seller registration, staff sign-in and the admin keep a compact toran and the palette, and stay plain.
- **Generous space.** Plenty of room, short plain-English copy, hairlines rather than boxes.

The full site is open (the coming-soon switch was removed on 2026-10-24, client's decision): the home page is the
festival page with the search added, and buyers browse, make an account and send enquiries.

## 2. Colour palette & roles

| Token | Hex | Role |
|---|---|---|
| `background` | #fff9ef | Cream page |
| `foreground` | #3a2418 | Body text, a warm brown ink (14:1 on the page) |
| `card` / `popover` | #ffffff | Cards, form panels, header, dropdown lists |
| `primary` | #9c2f28 | Kumkum: buttons, links, focus ring, headings, the wordmark (7.6:1 on the page) |
| `on-primary` | #ffffff | Text on kumkum (8:1) |
| `secondary` / `muted` | #fbecd6 | Turmeric: secondary buttons, highlighted list option, photo placeholders, the industries band and the footer |
| `muted-foreground` | #6b5141 | Secondary text (≥ 4.5:1 on the page, cards, turmeric and leaf) |
| `accent` | #ffd27a | Marigold: pills, the offer price, highlights. **Behind text only, never text** |
| `on-accent` | #3a2418 | Text on marigold; kumkum on marigold passes too |
| `sage` | #e3f0dc | Leaf: a fresh section background. (The token keeps its old name.) |
| `border` | #f0dcc0 | Decorative hairlines and card outlines |
| `input` | #977d6b | Form-control borders and the scrollbar thumb (≥ 3:1, as WCAG requires for controls) |
| `destructive` | #b42318 | Errors — always with an icon or words, never colour alone |
| `success` | #067647 | Confirmations |

**Festival colours** (decoration only, never text, in `components/festive.tsx` and the home page):
gold #f2a20c (the rangoli, underlines, the steps' path and medallions, the diyas), turmeric #f7c548 and
leaf #3f7d4e (toran flags, rangoli petals). The jharokha arches use soft washes: kumkum #fbe3dd→#f6cfc6,
marigold #fff0c9→#ffd98a, leaf #e9f4e3→#d3e8c9 (deeper versions in dark mode). The closing card on the
home page is fixed kumkum with marigold #ffd27a in both modes.

**Dark mode** (`.dark` in `globals.css`, on screen only): the festival by lamplight. Page #1b130f, cards
#251a14, text #f4e8d8, secondary text #cdb7a2, primary a light marigold #f2b866 with dark text on it,
marigold becomes a deep #5c3a14, leaf #1f281b, hairlines #3d2b21. It is never automatic: the header's
toggle puts `.dark` on `<html>` and stores `theme=dark` in a cookie, and the root layout renders the next
page dark, so there is no flash.

Contrast is enforced: `src/lib/brand-contrast.test.ts` reads `:root` and `.dark` and fails CI if a pairing
drops below WCAG AA (4.5:1 text, 3:1 controls and focus) in either theme. `dark:` utilities apply only
under the `.dark` class.

## 3. Typography

Two families, both self-hosted by `next/font` (no request to Google from the visitor):
**Hind Vadodara** for everything you read and use — it sets Gujarati as well as English, and its
Devanagari sister **Hind** sets Hindi (both only fetched where those scripts show) — and
**Fraunces** (`font-display`) for headings and the wordmark. Fraunces has no Gujarati or Hindi letters, so
those headings fall to Hind, upright: Hind has no italic, and the emphasis keeps its colour and underline
without a fake slant (`font-synthesis-style: none`). Never letter-space Gujarati or Hindi (the eyebrow
"B2B marketplace for Harsol" stays English for that reason). `globals.css` turns on Fraunces' SOFT and
WONK axes for every `font-display`, which gives the Marigold voice. Use italics for emphasis. Display
headings are kumkum. The offline page uses the system font, because the web fonts may not be cached.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Home headline | 46px → 112px (`clamp`) | 400 | Fraunces, `leading-[0.96]`, `text-balance`; "*call them.*" in kumkum italic over a hand-drawn marigold underline that draws itself |
| Page title (h1) | 60px (36px phones) | 400 | Fraunces, kumkum, on Seller registration and marketing pages. Forms and dashboards keep Hind 30px/700 |
| Section heading (h2) | 60px (48px phones) | 400 | Fraunces, kumkum |
| Gujarati line | 16–18px | 600 | Hind Vadodara, kumkum, often in a cream pill, with `lang="gu"` |
| Eyebrow | 12px | 700 | Hind, uppercase, `tracking-[0.22em]` |
| Admin page title | 24px | 700 | |
| Card heading | 18px | 600 | |
| Lead paragraph | 18px | 400 | `muted-foreground` |
| Body | 16px | 400 | |
| Small text, nav links | 14px | 400–500 | Inputs drop to 14px from 768px up (16px on phones stops iOS zoom) |
| Badge | 12px | 500 | |

Wordmark: "Harsol*27*" in kumkum Fraunces, "27" in italic, 27px (24px phones), tight tracking.

## 4. Component stylings

Use the components in `src/components/ui/` rather than restyling raw elements.

- **Button** (`button.tsx`): radius 16px, 14px/500 label.
  - Default: kumkum, 40px tall; a little darker on hover (a lighter hover would drop the white text below 4.5:1).
  - `lg`: 48px tall, 16px label.
  - `outline`: cream with a hairline border.
  - `secondary`: turmeric.
  - `ghost` and `link` (kumkum text, underline on hover).
  - Every button gets the 3px kumkum focus ring, and moves down 1px when pressed.
- **Input / Textarea**: white (the card colour by lamplight, like the Dropdown, so a form's fields all match), 1px `input` border, 40px tall, radius 16px. Invalid fields get a red
  border and ring plus an error message linked with `aria-describedby`.
- **Dropdown** (`dropdown.tsx`): use this for every choice from a list. Never use a native `<select>`.
  - Closed, it looks like an Input, with a chevron that flips when open.
  - The list is a white popover: radius 16px, `shadow-lg`, 4px padding, up to 288px tall, scrolling inside.
  - Options are 14px. The highlighted one has a turmeric background; the chosen one is semibold with an kumkum check.
  - It opens upwards when there's no room below.
  - The list floats above the page (a popover in the top layer), so a table or card that scrolls sideways
    never cuts it off; it follows its button when the page scrolls.
  - Long lists (industries) are `searchable`: opening puts the cursor in a search box at the top of the
    list ("Search industries"), typing narrows the options, and `pinned` options ("All industries",
    "Other (not listed)") always stay listed.
  - `multiple`: each option has a tick box and toggles; the list stays open while choosing (Escape, Tab or
    a click outside closes it), and the button lists the choices, comma-separated. Not used at present:
    Seller registration's "Industry" became a single choice on 2026-10-19 (one industry per person).
  - "Other (not listed)" (Seller registration): choosing it shows a "Your industry" field where the visitor
    types their own; staff see it as "Other: …".
- **Fields in parts** (Seller registration): the name as First name, Middle name, Last name, three
  across from 640px (stacked on phones); the address as Address (full width), then City and State (a
  searchable dropdown of India's states and union territories) side by side, and Pincode (6 digits) under
  City. The phone field is "WhatsApp number"; the category dropdown is labelled "Category".
- **Optional group** (Seller registration's "Links to your business"): a `<fieldset>` whose legend says
  "(optional)" in muted text: Website, Instagram (any of @name, name or a link) and Google Maps link.
  Links are tidied ("https://" added) and only http(s) addresses are kept.
- **Payment** (Seller registration's "Pay the fee", `src/lib/fee.ts`): a turmeric panel with the client's UPI QR
  code on a white tile beside the price. The QR is their printed bank code module for module (never
  re-encoded, never a logo over it), in brown ink with kumkum corner markers and a white margin. Beside it: the regular price struck through
  in muted serif, the offer price in large kumkum serif, "for 15 months", a marigold "Offer price till …" pill
  while the offer lasts and three numbered steps. Under the QR, a "Save the QR code" link (a PNG, so UPI
  apps can open it from the phone's photos). Below both, a white card "Pay by UPI ID or bank transfer":
  account name, UPI ID, account number, IFSC and bank (branch beneath), two columns from 640px, with
  icon-only Copy buttons (`CopyButton compact`) on the values people type. Under the panel, a
  required "Payment screenshot" file field (JPG, PNG or PDF, 5 MB) that uploads at once and shows
  "Uploaded: name"; Submit waits for the upload.
- **Card** (a plain bordered `div`, not the shadcn `<Card>`): white, 1px `border`, radius 22px, padding 16–20px
  (form panels 20px, 32px from 640px up).
  - Clickable cards turn the border kumkum on hover.
  - Product cards add a 4:3 photo on turmeric, and the title underlines on hover.
- **Industry tile**: white, bordered, radius 16px, 12px × 16px padding, medium weight, kumkum border on hover.
- **Eyebrow pill**: translucent white, a thin kumkum outline, kumkum 12px uppercase letter-spaced text. At most one per page.
- **Pill buttons**: on the home and marketing pages, buttons and the hero search are fully rounded
  (`rounded-full`). Forms and tools keep the 16px radius.
- **Badge** (`badge.tsx`): 20px tall, fully rounded, 12px. Default (kumkum) for "new", secondary (turmeric) for other statuses.
- **Admin header** (`admin/layout.tsx`): the logo and name on the left (no "Admin" label); on the right,
  the staff member's initials in a 40px kumkum circle, then their name with a small "Sign out" (icon and
  underlined text, 24px tall) beneath it.
- **Admin overview** (`admin/page.tsx`), top to bottom:
  - a greeting band (cream to marigold wash; the rangoli whole on the right from 768px, turning slowly
    unless reduced motion): the India-time date, "Good morning/afternoon/
    evening, <first name>" in the serif, the access line, and a pill to the pending registrations;
  - "Seller registrations": four cards, two across on phones (All, in kumkum; Pending, Approved, Rejected
    with a coloured dot), then a thin bar of the approval split;
  - "Registrations, last 14 days" (an SVG bar a day, today in marigold) beside "Waiting for approval" (the
    five waiting longest);
  - "Top native places" and "By category" as thin bars;
  - "Marketplace": the seller, inquiry and subscription counts as small cards ("opens after launch" before then).
  Charts are SVG with sizes as attributes (the CSP blocks inline styles). The pending marigold is #f2a20c,
  the toran's, because `accent` turns dark brown in dark mode. Each card opens the filtered list; the leads
  list has an Approval filter for that.
- **Approval pill** (admin leads, `admin/leads/decision.tsx`): in the list's Approval column and on a lead's
  page, a status-style pill: Pending (turmeric), Approved (green tint), Rejected (red tint). Admins click it
  to open a small list (Pending, Approved, Rejected) and the choice is saved at once; viewers see the pill only.
  It is the Dropdown with `triggerClassName` restyling its button. Separate from the contact status; each
  change is in the lead's history ("Approval: Pending → Approved").
- **Payment pill** (a lead's page): the same pill for the payment, beside "View the screenshot". An admin
  checks the screenshot, then sets Approved; only then does the subscription count, and the seller is listed
  under Subscriptions → Seller registrations. In the history as "Payment: Pending → Approved".
- **Lead page details**: a white card with the details side by side, label over value: three columns from
  1024px, two from 640px, one on phones (the browser string spans the row). First Approval, Payment, Payment
  screenshot, Subscription. Under the card, for admins, **Subscription**: Start date, Tenure (months) and End
  date side by side, then "Save subscription". Changing the start or the tenure fills in the end date (the
  day before the same date, that many months later); the end can still be changed by hand.
- **Table** (`table.tsx`): sits in a ScrollArea that scrolls sideways on phones and takes its card's rounded corners. Pass `scrollLabel`
  so keyboard users can reach it.
- **ScrollArea** (`scroll-area.tsx`): use it for anything that scrolls inside a page.
  - Thin brand scrollbar: 10px, `input`-coloured thumb, kumkum on hover.
  - Soft edge shadows while there is more to see.
  - Set `--scroll-bg` to the colour behind it.
- **Header**: under a compact toran (not sticky), sticky itself (it stays at the top), white at 85% with a blur, bottom hairline, full width with the
  page gutters (16px, 24px, 40px from 1024px), like the footer.
  - In the left corner, the Harsol Sattavis Jain Yuvak Trust's logo (`public/logo.webp`, 52px, reaching into
    the header's padding so the header stays 65px; 44px under 360px), then the trust's name in two lines
    no taller than the button: "Shree" (Hind 12px/600, `muted-foreground`; 10px on phones) before "Harsol27"
    (Fraunces 22px; 18px on phones), over "Jain Yuvak Trust, Bhayander" (Hind 12px/600, `muted-foreground`;
    10px and wrapping on phones). The same lockup heads the admin and staff sign-in. The footer reads
    "© <year> Shree Harsol Sattavis Jain Yuvak Trust, Bhayander".
  - In the right corner: 14px/500 text links (Home, Search, About, Sign in or Your account) that underline
    on hover, the **language button** (a languages icon and the current language in its own script,
    "English", "हिन्दी", "ગુજરાતી", a borderless dropdown), the dark-mode toggle (moon/sun), then an kumkum
    pill "Seller registration" button ("Register" on phones).
  - Below 1024px the links, the language button and the toggle move into a **menu** (a "Menu" button that
    opens a panel under the header with the links in serif, then a "Language" row and a "Dark mode" row;
    Escape closes it). The "Seller registration" button stays visible.
  - A 2px kumkum **reading-progress line** along its bottom edge, driven by the scroll in CSS
    (`.scroll-progress`, scroll-driven animations; browsers without them don't show it).
  - Every public page uses its `blend` form: clear at the top (over the home page's rangoli), frosting into
    a cream bar as you scroll. Seller registration's page starts
    under it (65px), so its rangoli runs up to the toran.
- **Footer**: turmeric, a top hairline, full width with the page gutters (16px, 24px, 40px from 1024px):
  one slim row (20px padding): the copyright in `muted-foreground` on the left, the text links (About,
  FAQ, Contact us, Terms, Privacy) on the right (on their own line, still right, when a phone wraps them).
- **Contact us** (`/contact`, open while the site is closed): the text-page layout, a Gujarati pill
  "કોઈ પ્રશ્ન છે? અમારો સંપર્ક કરો.", then two white cards side by side (stacked on phones), each with an
  icon disc, a small label, the number or address large, and a pill button: kumkum "Chat on WhatsApp"
  (+91 91520 00352) and outline "Write an email" (sh27jyt@gmail.com); below them, across the row, the trust's
  address with an outline "Open in Google Maps". The details live in `lib/contact.ts`.
- **Floating buttons** (bottom right, every public page): a kumkum pill "Talk to us" (opens a WhatsApp chat
  with the team, on every page but Contact us, which has its own WhatsApp button), and above it a round "Back to top" that
  appears after 600px of scrolling, scrolls up (smoothly unless reduced motion) and moves focus to the main content.
  Sticky at the end of the main content, not fixed: they ride 16–24px above the bottom of the screen, and
  at the end of the page stop the same distance above the footer, never over it.
- **Language popup** (`components/language.tsx`): on a visitor's first visit, a native modal `<dialog>`
  (the confirmation dialog's card) asks "Choose your language" in all three languages, with three outline
  pill buttons (English, हिन्दी, ગુજરાતી) and a line in each language saying the header's button changes it
  later. Escape keeps English; either way it does not ask again.
- **Cookie notice**: a white card, bottom left (full width on phones), until "OK" (a form post, so it works
  without JavaScript; remembered for a year). It says what is true: essential cookies only. If analytics or
  advertising cookies are ever added, it must become a real choice first.
- **Confirmation dialog** (`confirm-button.tsx`): for actions that can't be undone or that tell someone
  outside the team (reject or suspend a seller, remove a listing, delete a photo). A native `<dialog>`: a
  title asking the question, one sentence on what will happen, then "Cancel" (focused first) and the action
  in red. Only the dialog's button submits.
- **Password field** (`password-input.tsx`): every password input has an eye button at its right edge
  ("Show password", `aria-pressed`) that shows and hides what was typed.
- **Copy button** (`copy-button.tsx`): a small outline pill "Copy" next to a seller's phone and email,
  turning to "Copied" with a tick; announced to screen readers.
- **FAQ** (About page): native `<details>`, one per question, between hairlines; a plus that turns into a
  cross when open. Answers say only what the site does.
- **Loading**: a thin kumkum bar sliding along the top of the window while the next page loads
  (`navigation-progress.tsx`; a still bar with reduced motion). Pages are not streamed behind a loading
  screen: that would make a missing page answer 200 instead of 404, and break server redirects.
- **Last updated**: legal pages show "Last updated 10 October 2026" under the title (`ProsePage updated=`).
- **Admin and seller tabs**: one horizontal row that scrolls sideways on phones.
- **Icons**: `lucide-react`, 16px (`size-4`), `aria-hidden`, always next to a text label.
- **Festival pieces** (Marigold; `src/components/festive.tsx`, styles in `globals.css`):
  - **Toran** (`<Toran>`): flags in gold, kumkum, leaf and turmeric on a gently sagging string, swaying
    from the string. One size (32–44px), above the header on every page: the home and public pages, staff
    sign-in and the admin.
  - **Rangoli** (`<Rangoli>`): three rings of soft petals (kumkum, gold, leaf), a ring of gold dots and a
    centre. It draws itself ring by ring on load and turns with the scroll (`data-spin`). Behind the
    home headline (35%), in its closing card (25%), and faint in Seller registration's corner.
  - **Jharokha arch cards**: fully round tops, an inner outline, a kumkum, marigold or leaf wash; they rise
    in. The three promises. Each has a flat illustration in the arch, not a photo (`<SealArt>`, `<CallArt>`,
    `<DealArt>`: inline SVG, the same 4:3 box in every card), on a soft halo (white; a faint gold glow by
    lamplight) under a dotted arch of gold dots like a rangoli's border:
    - *Approved sellers only*: a seal of gold marigold petals round a kumkum disc, a cream tick, leaf ribbons.
    - *Straight to the seller*: a kumkum phone whose cream screen shows the seller (gold avatar, number and
      email lines, a leaf call button), ringing in arcs of `primary` either side.
    - *Your deal, your terms*: a handshake, a kumkum sleeve with a gold cuff meeting a gold sleeve with a
      kumkum cuff (sandal hands #f0c595, creases #c98d5a), the sleeves fading in from the wash, gold sparkles.
    The fills are the festival colours and stay the same in dark mode. Each plays a short entrance once when
    scrolled to (`data-play`): the seal stamps in, its ribbons drop, the tick draws and a gold ring ripples
    out; the phone rises, its screen fills in and it rings; the two hands slide in and meet, then the
    sparkles pop. On screen at load, with reduced motion or without script they simply stand finished.
  - **Diya chips**: every industry as a cream pill with a glowing gold dot; they light up one after another
    as the section scrolls by (`data-light`).
  - **Step medallions**: gold discs with a large Fraunces number, joined by a gold path that draws itself
    with the scroll (`data-path`).
  - **Ticket**: the offer, a kumkum stub with the price counting up and the regular price struck through,
    a dashed perforation with notches cut from both sides, and the details on white, headed
    "સેલર રજીસ્ટ્રેશન ઓફર · Seller registration offer".
  - **Rotating word** (`<RotatingWord>`): "manufacturers / wholesalers / traders", one sliding up every
    2.2s; hidden from screen readers, which get the whole sentence.
  - **Closing card**: fixed kumkum with marigold in both modes, a turning rangoli, and floating petals.
- **Staff sign-in**: compact toran, then the wordmark top left where the site header has it
  (`staff/layout.tsx`), and centred below a Fraunces "Staff sign in", the line "Admins login." and the
  form on a white card: the site's own fields (`Input`, `PasswordInput`, 48px tall) and a full-width
  kumkum button; "Forgot password?" under it. /staff/forgot-password and /staff/reset-password share that
  layout (staff only: members cannot reset their own password).
- **Member sign-in** (`/sign-in`): the auth card with "Username" and "Password", the line "Forgot your
  password? Contact the Harsol27 team." and, below, "New to Harsol27? Create an account" (to `/sign-up`) and
  "Selling? Register your business" (to Seller registration). No Google, no self-service reset.
- **Buyer sign-up** (`/sign-up`, since 2026-10-24): the same card with Your name, Mobile number (sellers get
  it with enquiries), Email, Username and Password (at least 8 characters); the account works at once and
  signs in. Sellers don't sign up: the team makes their login from an approved registration, or links the
  buyer account whose email and mobile number match it.
- **Members list** (admin, `/admin/members`): every member login, buyers and sellers, searchable; admins
  can reset any member's password there (it asks first, then shows the new one to send on WhatsApp).
- **Seller login** (admin lead page): an approved registration gets a username field (suggested from the
  name) and "Create login". Then a card stays: Username, Password and Status (Active / Switched off),
  "Copy username and password" for WhatsApp, and an outline "Reset password" (it asks first) for an
  active login. Admins see the password (client, 2026-10-19); viewers see the username only. Only admins
  reset seller passwords.

## 5. Layout principles

- Tailwind's 4px spacing scale.
- Containers:
  - 1152px (`max-w-6xl`) for public pages;
  - 768px (`max-w-3xl`) for seller pages;
  - 576px (`max-w-xl`) for single forms.
- Gutters: 16px on phones, 24px from 640px.
- Vertical rhythm:
  - pages: 40–48px top and bottom;
  - home sections: 96px, 128px from 640px; full-width, alternating cream, turmeric, leaf, white and marigold;
  - hero: at least the screen's height from 1024px.
- Home (`src/app/(public)/page.tsx`, the coming-soon festival page until 2026-10-24): the full Marigold
  festival, under the toran and the site header in its `blend` form: clear at the top, with no hairline, and
  the hero slides up under it so the rangoli runs up to the toran; it frosts into a cream bar over the first
  120px of scroll (CSS scroll timeline, `.header-blend`). Then, top to bottom:
  - **Hero**, centred on the rangoli: a pill in the page's other script ("હરસોલનું પોતાનું B2B માર્કેટપ્લેસ"),
    the eyebrow "B2B marketplace for Harsol", the headline, the rotating word, one paragraph, the rounded
    search, then outline pills "Browse by industry" and "Register your business".
  - **Why Harsol27?**: three arch cards.
  - **A festival of trades**: every industry as a diya chip linking to its page, on turmeric.
  - **How it works**: three medallions on the drawn path.
  - **The offer**: the ticket.
  - **Closing card**, then the site footer.

  The registration form is called Seller registration (at `/Seller-Registration`; `/get-started`,
  `/Pre-Registration` and other spellings redirect there).
- Grids:
  - industries: 2 → 3 → 4 columns;
  - products: 1 → 2 → 3 → 4 columns;
  - search filters: 2 → 5 columns.
- Gaps are 12–16px.

## 6. Depth & elevation

The site is almost flat: surfaces are separated by colour (cream page, white cards, soft sections) and
1px hairlines. Cards lift 2–4px on hover and catch the spotlight; product photos zoom 5% inside their frame.

- **Shadows:** only floating layers get one. Dropdown lists use `shadow-lg`; the stacked cards, which
  pile on each other, use a soft kumkum-tinted `shadow-xl`.
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
| `data-parallax="10"` | Drifts by that percent of its height as the page scrolls past. Not used at present. |
| `data-draw` | A line that draws itself as its section scrolls by. |
| `data-scroll-text` (via `<ScrollText>`) | A statement whose words go from faint to full while it crosses the screen (as on lenis.dev). |
| `data-slide="left"` / `"right"` | A giant line slides in from that side as it scrolls up the screen (finishing by the bottom of the page). Its section needs `overflow-x-clip`. |
| `data-stack` | On a list of CSS-sticky cards: each card sinks back to 92% as the next one slides over it. |
| `data-marquee` | A track holding its content twice drifts sideways for ever; scrolling speeds it up, scrolling back turns it round. |
| `data-spin="140"` | Turns that many degrees while it crosses the screen. The rangolis. |
| `data-path` | An SVG path (`pathLength={1}`, class `drawn-path`) that grows bit by bit as you scroll, from when its drawing is near the bottom of the screen (85%) until it is near the top (25%). The steps' path. |
| `data-light` | Its `[data-lamp]` items go from dim to lit one after another as it scrolls by. The diya chips. |
| `data-play` | An illustration whose entrance is CSS (`globals.css`): held at its start below the fold (`data-play="wait"`), played once when its top reaches 90% of the screen (`"on"`). Without it the illustration stands finished. The arch cards' illustrations. |

BlurText and CountUp are adapted from React Bits (reactbits.dev), rebuilt on GSAP. Nothing follows the mouse: the
spotlight, magnet and tilt effects were removed at the client's request (2026-10-19). Don't add pointer-following effects.
CSS-only festival motion (`globals.css`): the toran sways, the rangoli and the hand underline draw
themselves once (`stroke-draw`), the rotating word slides (300ms, strong ease-out), and the petals float.
All of it stops for reduced motion. Curves are `--ease-out` and `--ease-in-out` on `:root`.

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
- Use only the tokens. No new hex values in components (the festival pieces are the exception).
- Keep kumkum text for things you can click or focus, and for headings.
- Write plain, short English, and say what happens next ("Our team will get in touch").
- Give every input a visible `<Label>`, and every error both words and an icon.
- Keep the 3px kumkum focus outline visible on everything interactive.
- Respect `prefers-reduced-motion` (motion.tsx and the global CSS rule already do).
- Add motion with the data attributes above, not with one-off animation code.

**Don't**
- Don't add dark sections. In the light theme sections are cream, turmeric, leaf, white or marigold.
- Don't use inline `style` attributes or `<style>` tags. The site's Content Security Policy blocks them,
  so they silently do nothing. Use Tailwind classes; arbitrary values like `fill-[#c3cdb9]` are fine.
- Don't use marigold as a text colour (it is a background), or bold the serif.
- Keep the festival on the welcoming pages. The home page carries the full set; Seller registration
  gets the compact toran and a faint corner rangoli; staff sign-in and the admin get only the compact
  toran. No gradients or glows elsewhere, apart from the spotlight's hover light on cards.
- Don't hide anything that is on screen at load until a script runs, and never fade the main headline.
- Don't use native `<select>`. Use `Dropdown`.
- Don't use colour alone to show status or errors.
- Don't style dark mode one component at a time. Use the tokens; add a missing one to `.dark` (and the contrast test).

## 8. Responsive behaviour

- Breakpoints (Tailwind defaults): 640px (`sm`), 768px (`md`), 1024px (`lg`), 1280px (`xl`). Design phone-first.
- Touch targets: controls are at least 40px tall, and primary and hero actions are 48px.
- Collapsing:
  - below 1024px the header's links, language button and dark-mode toggle move into the menu;
  - grids drop columns;
  - admin and seller tabs, and tables, scroll sideways rather than wrap;
  - the hero stacks.
- Images: product photos are 4:3 with `object-cover` on a turmeric placeholder. A missing photo shows an icon,
  not an empty box. Photos load lazily, except the first few on a page.

## 8a. Print

`@media print` (end of `globals.css`) plus `print:hidden` on the header's controls, footer, floating
buttons and cookie notice: a printed page is the content, ink on white, always in the
light theme, with anything the scroll animations had not revealed yet shown.

## 9. Agent prompt guide

**Quick reference:**
- Page: cream #fff9ef; soft sections: turmeric #fbecd6, leaf #e3f0dc, marigold #ffd27a
- Cards: #ffffff with a #f0dcc0 border, radius 22px
- Text: #3a2418, secondary #6b5141
- Action, links and headings: kumkum #9c2f28; decoration gold #f2a20c (never text)
- Fonts: Hind Vadodara for text (Latin and Gujarati), Hind for Hindi; Fraunces (soft, wonky cut; italics for emphasis) for headings and the wordmark
- Festival pieces: `<Toran>`, `<Rangoli>`, arch cards, diya chips, the ticket (`components/festive.tsx`)
- No dark sections; dark mode only when the visitor turns it on
- Corners: 16px for controls, 22px for cards, fully round pills on festival pages

**Example prompts:**
- "Build the seller's 'Edit profile' page in the Harsol27 style. Follow DESIGN.md:
  - a 576px form panel (a white card), Labels above Inputs, `Dropdown` for choices;
  - one kumkum primary button and an outline Cancel;
  - errors in words, linked with aria-describedby."
- "Add a 'Recent inquiries' list to the admin dashboard, matching the existing admin tiles:
  - white bordered cards with radius 22px and an kumkum border on hover;
  - muted 14px labels, and a Badge for status."

## Known gaps

- **Unused components:** the shadcn `<Card>` exists but pages use plain bordered `div`s. Follow the pages.
- **Next.js error overlay:** in `pnpm dev`, its inline styles are blocked by the CSP. This doesn't affect the live site.
- **Unwritten guidelines:** there are none yet for illustrations, product photography or email design.
  Emails use plain inline-styled HTML, which email clients require.
