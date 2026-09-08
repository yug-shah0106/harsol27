# 06 — PWA Specification (Android & iOS)

The PWA **is** the mobile strategy. No app-store submission, no React Native codebase, no separate
release cycle. This is the right trade for a lead-generation directory — but iOS imposes real
limits, and the honest ones are listed in §7.

Implementation: **Serwist** (the maintained successor to Workbox's Next.js plugin) generating the
service worker at build time.

## 1. Manifest

`public/manifest.webmanifest`:

```json
{
  "name": "Community B2B Marketplace",
  "short_name": "Marketplace",
  "description": "Find verified suppliers in your community. Search products, connect with sellers.",
  "id": "/",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "display_override": ["standalone", "minimal-ui"],
  "orientation": "portrait-primary",
  "background_color": "#F8FAFC",
  "theme_color": "#2E4BD8",
  "lang": "en-IN",
  "dir": "ltr",
  "categories": ["business", "shopping", "productivity"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/mobile-home.png",  "sizes": "1080x1920", "type": "image/png", "form_factor": "narrow" },
    { "src": "/screenshots/mobile-search.png","sizes": "1080x1920", "type": "image/png", "form_factor": "narrow" },
    { "src": "/screenshots/desktop-home.png", "sizes": "1920x1080", "type": "image/png", "form_factor": "wide" }
  ],
  "shortcuts": [
    { "name": "Search products", "url": "/products",        "icons": [{ "src": "/icons/sc-search.png",  "sizes": "96x96" }] },
    { "name": "My leads",        "url": "/seller/leads",    "icons": [{ "src": "/icons/sc-leads.png",   "sizes": "96x96" }] },
    { "name": "Add product",     "url": "/seller/products/new","icons":[{ "src": "/icons/sc-add.png",   "sizes": "96x96" }] }
  ],
  "prefer_related_applications": false
}
```

Notes that matter:
- **Maskable icons are separate assets**, with the logo inside the 80% safe circle. Reusing the
  square icon as maskable is the standard mistake and produces a clipped logo on every Android
  launcher.
- `screenshots` with `form_factor` is what turns Chrome's install prompt from a thin address-bar
  chip into a rich install card. Materially better install rates for the cost of three PNGs.
- `theme_color` `#2E4BD8` matches `primary-600`; the iOS status bar and Android task-switcher chrome
  both pick it up.

## 2. Caching strategy

| Asset class | Strategy | Detail |
|---|---|---|
| App shell, JS, CSS, fonts | **Precache** at install | Content-hashed, so revalidation is unnecessary |
| Product images (R2) | **Cache-first**, 200 entries, 30 days | The biggest bandwidth win on 4G |
| `GET /api/v1/products`, `/categories`, `/filters` | **Stale-while-revalidate**, 5 min | Instant repeat searches, quietly refreshed |
| Product & seller detail pages | **Network-first**, 3 s timeout → cache | Freshness preferred, but never a blank page on a flaky connection |
| Authenticated routes (`/seller/*`, `/admin/*`, `/account/*`) | **Network only, never cached** | A cached dashboard served to a second user on a shared phone is a data breach. Enforced by an explicit deny rule in the SW *and* an E2E assertion. |
| All `POST`/`PATCH`/`DELETE` | Network only, with Background Sync where supported | |

## 3. Offline behaviour

- `/offline` fallback page: brand mark, "You're offline", a **retry** button, and links to the last
  10 products the user viewed (from cache). Not a dead end.
- Previously visited product pages open from cache with an "Offline — showing saved version" banner.
- **Background Sync** on the inquiry form: if the buyer submits while offline, the request is queued
  and replayed on reconnect, and the UI says so plainly. Chromium only; on Safari the form fails
  fast with a clear retry message rather than a silent hang.
- Seller product drafts autosave to IndexedDB every 3 s. Sellers upload from patchy mobile networks;
  losing a half-typed listing with four photos attached is the difference between a seller who
  returns and one who does not.

## 4. Install experience

Do **not** show the browser's default prompt immediately. Capture `beforeinstallprompt`, suppress
it, and surface a custom install card only after the user has shown intent:

- viewed ≥ 3 products, **or**
- completed an inquiry (highest-intent moment — offer it in the success state), **or**
- is a seller who has logged in twice.

Dismissal is remembered for 30 days. Track `appinstalled` against the funnel in `01-PRD.md` §6.

## 5. Push notifications

Web Push over VAPID — no FCM project, no cost.

Permission is requested **contextually, never on load**: for sellers, immediately after their first
lead arrives, with the line "Get notified the moment a buyer contacts you." A cold permission prompt
on page load gets denied ~90% of the time and the denial is permanent, so the timing here is the
whole ballgame.

Payloads carry `title`, `body`, `icon`, `badge` (monochrome, 96×96), `tag` (collapses duplicates),
`data.url`, and actions (`View lead`, `Call buyer`). The SW's `notificationclick` focuses an existing
client if one is open rather than opening a second window.

Failed subscriptions returning 404/410 are deleted from `PushSubscription` on the spot; otherwise the
table fills with dead endpoints and every send slows down.

## 6. Mobile-native touches

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Marketplace">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">
```

- Safe areas: `env(safe-area-inset-bottom)` on the bottom tab bar and sticky CTAs, or the home
  indicator overlaps them on every notched iPhone.
- `overscroll-behavior-y: contain` on scroll containers to stop pull-to-refresh firing inside sheets.
- `-webkit-tap-highlight-color: transparent`, with a real `:active` state to replace the feedback.
- 16px minimum font on inputs (no iOS zoom-on-focus) — also in `05-DESIGN-SYSTEM.md` §4.
- `autocomplete="one-time-code"` + `inputmode="numeric"` on the OTP field: iOS offers the code from
  the SMS above the keyboard, removing a whole step from the highest-value flow in the product.
- Native share via `navigator.share` on product pages, falling back to copy-link.
- `navigator.vibrate(10)` on successful contact reveal where supported.

## 7. iOS limitations — state these to the client before launch

Do not let anyone discover these in UAT:

| Limitation | Reality | Mitigation |
|---|---|---|
| Install requires **Share → Add to Home Screen** | Safari has no install prompt API | A dismissible one-time instructional card with a screenshot, shown only to iOS Safari users |
| Web Push needs iOS **16.4+** *and* the app installed to the home screen | Push does not work in the Safari tab | Email remains the guaranteed channel for every notification; push is additive |
| Service worker cache is evicted after ~7 days of non-use | Offline content disappears for infrequent users | Acceptable — offline is a convenience here, not core |
| No Background Sync | Queued offline submissions do not exist on iOS | Fail fast with an explicit retry, never a silent loss |
| Storage quota ~50 MB | Image cache must be bounded | 200-entry image cache cap (§2) |

None of these affect the core journey — search, view, inquire, call — which works fully on iOS
Safari, installed or not.

## 8. Acceptance criteria

- [ ] Lighthouse PWA: installable, valid manifest, offline-capable
- [ ] Installs and launches standalone on Android Chrome and iOS Safari 16.4+
- [ ] Maskable icon renders uncropped on a circular Android launcher
- [ ] `/offline` appears with the network off; a cached product page still opens
- [ ] Authenticated pages are **provably** absent from the cache (automated check)
- [ ] Push delivered to Android Chrome, and to installed iOS 16.4+
- [ ] Bottom tab bar clears the iPhone home indicator
- [ ] Inquiry form survives an offline→online transition on Chromium
- [ ] A new deploy updates the SW and prompts "New version available — refresh"
