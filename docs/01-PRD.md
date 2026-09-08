# 01 — Product Requirements Document

**Product:** Community B2B Marketplace Portal
**Version:** 1.0 (MVP)
**Status:** Draft for client sign-off
**Delivery form:** Responsive web application, installable as a PWA on Android and iOS

---

## 1. Problem & product thesis

Small and mid-size sellers in a trade community have products but no distribution. Buyers in the
same community have requirements but no reliable directory. Today the connection happens through
WhatsApp groups and word of mouth — unsearchable, unverified, and invisible to the community's
administrators.

This portal is a **curated, admin-vetted directory that converts browsing into a phone call.** Its
only job is to produce qualified leads. It deliberately does not handle money, orders, or delivery,
which is what keeps it cheap to run and free of dispute liability.

The product succeeds if a buyer can find a relevant supplier in under 60 seconds and reach them by
phone in under 90.

### 1.1 Design principles

1. **Curation is the product.** Every seller and every product passes an admin gate. The value is
   that the listings are trustworthy, not that there are many of them.
2. **The lead is the conversion event.** Every screen is measured by whether it moves a buyer
   toward submitting an inquiry.
3. **Contact is earned, not free.** Hiding seller contact behind a verified form is what makes the
   lead data real and stops competitors scraping the seller list.
4. **Mobile is the primary device.** Design and QA mobile first; desktop is the secondary layout.
5. **Zero-friction browsing, gated action.** No login to look. Verification only at the moment of
   intent.

## 2. Personas

**Priya — Buyer (procurement, small manufacturer).** On a phone, often on 4G, often mid-conversation
with her boss. Wants: does anyone in this community supply *this*, and what is their number. Will
abandon instantly at a signup wall. Success = she has the seller on the phone.

**Rakesh — Seller (owner of a 12-person unit).** Low digital literacy, uploads from a phone camera.
Wants: my products visible, and a ping the moment someone is interested. Success = leads arriving
without him logging in daily.

**Anita — Admin (community office staff).** Not technical. Wants: a queue of things needing her
decision, and no way to break the site. Success = she can clear the day's approvals in ten minutes.

## 3. Roles & permission matrix

| Capability | Guest | Buyer | Seller (pending) | Seller (approved) | Admin |
|---|:--:|:--:|:--:|:--:|:--:|
| Browse / search / filter catalogue | ✅ | ✅ | ✅ | ✅ | ✅ |
| View product detail (contact masked) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View seller contact details | ❌ | after inquiry | ❌ | ❌ | ✅ |
| Submit inquiry | ✅ (with verification) | ✅ | ✅ | ✅ | — |
| View own inquiry history | ❌ | ✅ | ❌ | ❌ | — |
| Access seller dashboard | ❌ | ❌ | ⚠️ read-only pending notice | ✅ | ✅ (impersonate-view) |
| Create / edit / delete own products | ❌ | ❌ | ❌ | ✅ | ✅ |
| Publish a product without approval | ❌ | ❌ | ❌ | ❌ | ✅ |
| View own leads | ❌ | ❌ | ❌ | ✅ | ✅ |
| Approve / reject sellers & products | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage categories & assignments | ❌ | ❌ | ❌ | ❌ | ✅ |
| Edit CMS pages | ❌ | ❌ | ❌ | ❌ | ✅ |
| View all leads | ❌ | ❌ | ❌ | ❌ | ✅ |

A rejected or deactivated seller retains login but sees only a status screen; their products are
delisted from public view immediately and restored on reactivation.

## 4. Requirements

Format: `ID | Requirement | Acceptance criteria`. Priority: **P0** = MVP blocking, **P1** = MVP
expected, **P2** = ship if time allows. Every P0 and P1 must have an automated test referenced in
`09-QA-SECURITY-LAUNCH.md`.

### 4.1 Public website (`PUB`)

| ID | P | Requirement | Acceptance criteria |
|---|:--:|---|---|
| PUB-01 | P0 | **Home page** with hero search, category grid, featured/recent approved products, trust strip (counts of sellers/products/categories), CTA to become a seller. | Renders in <2.0 s LCP on a throttled 4G mobile profile. Category grid shows all active categories with product counts. Only `APPROVED` products from `APPROVED`+`ACTIVE` sellers appear. |
| PUB-02 | P0 | **Product listing page** with keyword search, category filter, city/state filter, sort (newest / name), and pagination. | Filters compose (category + city + keyword together). Filter state lives in the URL query string and survives refresh, share and back-button. Empty state offers "post your requirement" CTA. |
| PUB-03 | P0 | **Product detail page**: image gallery, name, category breadcrumb, description, optional price, optional MOQ, city/state, seller company name + logo, **masked contact block** with "Get seller contact" CTA, and 4 related products from the same category. | Contact details are absent from the server response and the HTML source until the inquiry is verified — not merely hidden with CSS. Gallery is swipeable on touch and keyboard-navigable. |
| PUB-04 | P0 | **Seller profile page**: logo, company name, description, city/state, category badges, paginated grid of that seller's approved products, single inquiry CTA. | Contact masked identically to PUB-03. Only approved products listed. Returns 404 for pending/rejected/deactivated sellers. |
| PUB-05 | P1 | **CMS pages**: About Us, Contact Us, Privacy Policy, Terms & Conditions — content editable by admin. | Content renders as sanitised rich text. Contact Us includes a working general enquiry form (separate from product leads) plus static address/phone/map link. |
| PUB-06 | P1 | **SEO**: server-rendered pages, unique title/meta/canonical per product & seller, Open Graph tags, `Product` + `Organization` JSON-LD, `sitemap.xml`, `robots.txt`. | Sitemap regenerates on approval events and contains only publicly visible URLs. Lighthouse SEO ≥ 95 on product detail. |
| PUB-07 | P1 | **Global header/footer**: logo, search, category mega-menu, "Sell with us", login, and on mobile a bottom tab bar (Home / Search / Categories / Account). | Header search is reachable in one tap on mobile. Footer carries CMS links, the liability disclaimer and contact. |
| PUB-08 | P2 | **"Post your requirement"** — a buyer submits a free-text need; admin sees it as an unmatched lead and can route it. | Creates a `Lead` with `type = REQUIREMENT` and no `productId`. |

### 4.2 Search (`SRC`)

| ID | P | Requirement | Acceptance criteria |
|---|:--:|---|---|
| SRC-01 | P0 | Keyword search across product name, description and seller company name. | PostgreSQL full-text (`tsvector`) with `pg_trgm` fuzzy fallback so "bering" matches "bearing". p95 query < 200 ms at 50k products. |
| SRC-02 | P0 | Category filter, including a parent category matching all its children. | Two-level category tree supported. Selecting a parent returns children's products. |
| SRC-03 | P1 | City and state filters, populated from values actually present in the catalogue. | Filter options are derived from live data, not a hardcoded list; state list uses a canonical Indian state enum, city is free text normalised on save. |
| SRC-04 | P0 | Pagination, 24 per page, with total count. | Keyset or offset pagination; page number in the URL; page 1 renders server-side for SEO. |
| SRC-05 | P2 | Search-as-you-type suggestions for product names and categories. | Debounced 250 ms, max 8 suggestions, cancels in-flight requests. |

### 4.3 Lead generation (`LEAD`) — the core mechanic

| ID | P | Requirement | Acceptance criteria |
|---|:--:|---|---|
| LEAD-01 | P0 | Seller phone and email are hidden on all public surfaces until a buyer completes an inquiry. | Verified by an automated test that fetches the raw product-detail API response and asserts no phone/email substring is present. |
| LEAD-02 | P0 | **Inquiry form**: buyer name, phone, email (optional if phone verified), company (optional), quantity required (optional), message. | Client and server validation share one zod schema. Indian phone normalised to E.164. |
| LEAD-03 | P0 | **Verification gate**: on submit, buyer verifies phone by OTP (6 digits, 10-minute expiry, max 5 attempts, 60-second resend cooldown). Contact is revealed only after success. ⚠️ Falls back to email magic-link if SMS is descoped — see `00-SCOPE-RECONCILIATION.md` §B1. | Unverified submissions are stored as `PENDING_VERIFICATION` and never notify the seller. OTP is stored hashed, never logged, never returned in an API response. |
| LEAD-04 | P0 | On verification the `Lead` is created and the seller's phone, email and full address are revealed on-screen, plus tap-to-call and WhatsApp deep links. | `tel:` and `https://wa.me/<e164>?text=<prefilled>` links work on mobile. Revealed contact persists for that buyer on return visits. |
| LEAD-05 | P0 | Lead notifies the seller and the admin. | Email within 60 s; in-app notification immediately; Web Push if subscribed. Notification failure is retried and never blocks lead creation. |
| LEAD-06 | P1 | Deduplication: the same buyer inquiring on the same product within 24 h updates the existing lead rather than creating a duplicate. | Second submission increments `repeatCount`, does not re-notify. |
| LEAD-07 | P1 | Rate limiting: max 5 inquiries per phone per hour, 20 per IP per hour. | Returns HTTP 429 with a human-readable message. Counters are server-side. |
| LEAD-08 | P1 | Buyer "My Inquiries" page listing past inquiries with the revealed seller contact. | Accessible after the silent account creation in LEAD-03. |

### 4.4 Seller portal (`SEL`)

| ID | P | Requirement | Acceptance criteria |
|---|:--:|---|---|
| SEL-01 | P0 | **Registration**: company name, contact person, email, phone, password, city, state, GST/registration number (optional), company description, logo, requested categories. | Email uniqueness enforced. Password ≥ 10 chars, checked against a common-password list. Submits as `PENDING`. Confirmation screen explains the approval wait. |
| SEL-02 | P0 | **Approval workflow**: admin approves or rejects with an optional reason; seller is emailed either way. | State machine in `03-DATA-MODEL.md` §4.1 is enforced server-side; illegal transitions return 409. |
| SEL-03 | P0 | **Login / logout**, session persists 30 days on "remember me", 12 h otherwise. | httpOnly + Secure + SameSite=Lax cookie. Logout invalidates server-side. |
| SEL-04 | P0 | **Forgot / reset password**: emailed single-use token, 30-minute expiry. | Token is hashed at rest, invalidated on use and on password change. Response is identical whether or not the email exists (no account enumeration). |
| SEL-05 | P0 | **Dashboard**: counts of total/approved/pending/rejected products, total leads, leads in last 30 days, a 30-day lead sparkline, and the 5 newest leads. | All figures scoped to the logged-in seller. Loads in <1.5 s. |
| SEL-06 | P0 | **Profile management**: edit company info, contact details, description, logo, city/state. | Editing contact details does not require re-approval. ⚠️ Editing *company name* flags the profile for admin re-review (default: yes). |
| SEL-07 | P0 | **Product management**: create, edit, delete (soft), and view status of own products. | Editing an `APPROVED` product returns it to `PENDING` and delists it until re-approved — see `03-DATA-MODEL.md` §4.2. Delete is soft, preserving lead history. |
| SEL-08 | P0 | **Product fields**: name, category, description, 1–8 images, price (optional), price unit (optional), MOQ (optional), MOQ unit (optional), city, state. | Name 3–120 chars, description ≤ 4,000 chars. At least one image required. |
| SEL-09 | P0 | **Image upload**: multiple images, drag-to-reorder, first image is the thumbnail, client-side compression before upload. | Accepts JPEG/PNG/WebP/HEIC, max 10 MB each, 8 max. Server re-encodes to WebP at 1600/800/400/160 px. EXIF stripped. |
| SEL-10 | P0 | **Category access**: seller sees only admin-assigned categories and can post only into them. | Server rejects a product in an unassigned category with 403, regardless of what the client sends. A seller with zero assigned categories sees an explanatory empty state, not a broken form. |
| SEL-11 | P0 | **Lead inbox**: list own leads with buyer name, phone, email, product, message, date; detail view; mark as contacted/closed. | Sortable by date, filterable by status. ⚠️ CSV export — default: include, it is one afternoon of work and sellers always ask. |
| SEL-12 | P1 | **Notification centre**: in-app bell with unread count for the six seller triggers. | Marking read is per-notification and bulk. |

### 4.5 Admin panel (`ADM`)

| ID | P | Requirement | Acceptance criteria |
|---|:--:|---|---|
| ADM-01 | P0 | **Dashboard**: total sellers, pending sellers, approved sellers, total products, pending products, approved products, total leads; plus a 30-day leads chart and an "needs your attention" queue. | Each stat tile links to its filtered list. Counts computed in a single query, cached 60 s. |
| ADM-02 | P0 | **Seller management**: searchable/filterable list; approve, reject (with reason), activate, deactivate; view full profile and their products and leads. | Deactivating hides the seller and all their products from public view within one cache cycle (≤60 s). |
| ADM-03 | P0 | **Category management**: create, edit, delete, reorder; name, slug, optional parent, optional icon/image, active flag. | Deleting a category with products is blocked with a clear message offering "reassign products first". Slug auto-generated, editable, unique. |
| ADM-04 | P0 | **Seller-category assignment**: assign and remove categories per seller, multi-select. | Removing a category that the seller has live products in prompts for confirmation and moves those products to `PENDING` (they are no longer permitted). |
| ADM-05 | P0 | **Product moderation queue**: list pending products with image preview; approve or reject with reason; bulk approve. | Queue is the admin landing default when non-empty. Approval is idempotent. |
| ADM-06 | P0 | **Lead management**: all leads with filters (date range, seller, category, status), detail view, CSV export. | Exports respect the active filter. |
| ADM-07 | P1 | **CMS management**: rich-text editing of the four static pages, with sanitisation. | Output HTML is sanitised server-side against an allowlist. Preview before publish. |
| ADM-08 | P1 | **Admin notifications**: in-app + email for new seller registration, new product submission, new lead. | Digest option (immediate vs hourly) to avoid inbox flooding. Default: immediate for sellers/products, hourly digest for leads. |
| ADM-09 | P1 | **Audit log**: who approved/rejected/deactivated what and when. | Immutable append-only table, visible on seller and product detail views. Cheap to build, and it is the first thing asked for when a dispute happens. |
| ADM-10 | P2 | **Admin user management**: more than one admin account, with a super-admin role. | Default: single admin for MVP, table designed to support many. |

### 4.6 Notifications (`NOT`)

| ID | P | Trigger | Recipient | Channels |
|---|:--:|---|---|---|
| NOT-01 | P0 | Seller registration approved | Seller | Email, in-app, push |
| NOT-02 | P0 | Seller registration rejected (with reason) | Seller | Email, in-app |
| NOT-03 | P0 | Product approved | Seller | Email, in-app, push |
| NOT-04 | P0 | Product rejected (with reason) | Seller | Email, in-app, push |
| NOT-05 | P0 | New lead generated | Seller | Email, in-app, push |
| NOT-06 | P1 | Categories assigned/changed | Seller | Email, in-app |
| NOT-07 | P0 | New seller registration | Admin | Email, in-app |
| NOT-08 | P0 | New product submission | Admin | Email, in-app |
| NOT-09 | P0 | New lead generated | Admin | In-app, hourly email digest |
| NOT-10 | P0 | OTP for buyer verification | Buyer | SMS (or email magic-link fallback) |
| NOT-11 | P0 | Password reset | Seller/Admin | Email |

All emails are queued, retried with exponential backoff (3 attempts), and logged with delivery
status. A failing email provider must never break the user-facing request.

### 4.7 Cross-cutting (`SYS`)

| ID | P | Requirement | Acceptance criteria |
|---|:--:|---|---|
| SYS-01 | P0 | PWA installable on Android and iOS. | See `06-PWA-SPEC.md`. Passes Lighthouse "Installable". |
| SYS-02 | P0 | WCAG 2.1 AA. | Automated axe scan clean on every page; keyboard-only walkthrough of the three critical journeys; verified contrast tokens from `05-DESIGN-SYSTEM.md`. |
| SYS-03 | P0 | Performance: LCP < 2.0 s, CLS < 0.1, INP < 200 ms on 4G mobile. | Enforced by a Lighthouse CI budget in the pipeline. |
| SYS-04 | P0 | Security baseline. | See `09-QA-SECURITY-LAUNCH.md` §3. Includes OWASP Top 10 review, rate limiting, CSRF, security headers, image upload validation. |
| SYS-05 | P0 | Automated daily database backup with a **tested** restore procedure. | A restore is performed at least once before launch and the timing recorded in the runbook. An untested backup is not a backup. |
| SYS-06 | P1 | Error tracking and uptime monitoring. | Sentry (free tier) + an uptime pinger with email alerts. |
| SYS-07 | P1 | Analytics on the lead funnel. | Plausible or GA4: product view → inquiry started → OTP sent → verified → contact revealed. This funnel is how the client judges the product. |
| SYS-08 | P1 | Dark mode. | Tokens exist for it in `05-DESIGN-SYSTEM.md`; respects `prefers-color-scheme` with a manual override. |

## 5. Critical user journeys

These three are the ones with Playwright E2E coverage and manual UAT sign-off.

**CUJ-1 — Buyer finds a supplier and calls them.**
Home → search "ss 304 sheet" → filter category *Metals* + state *Gujarat* → open product → tap *Get
seller contact* → enter name + phone + message → receive OTP → enter OTP → contact revealed → tap to
call. *Target: under 90 seconds on mobile.*

**CUJ-2 — Seller onboards and gets their first lead.**
Register → confirmation screen → (admin approves) → approval email → login → see assigned categories
→ add product with 4 photos from phone → status *Pending* → (admin approves) → approval notification
→ product live → lead arrives → notification → open lead → call buyer.

**CUJ-3 — Admin clears the daily queue.**
Login → dashboard shows 3 pending sellers, 11 pending products → approve 2 sellers, reject 1 with
reason → assign categories to the new sellers → bulk-approve 9 products, reject 2 with reason →
review today's leads. *Target: under 10 minutes.*

## 6. Success metrics

| Metric | Target at 90 days | Why it matters |
|---|---|---|
| Approved sellers | 150+ | Directory density; below ~100 the catalogue feels empty. |
| Approved products | 1,000+ | Search needs results to be credible. |
| Inquiry-start → verified-lead conversion | ≥ 55% | If OTP is killing conversion, this is where it shows. Below 40%, switch to email verification. |
| Product-view → inquiry-start | ≥ 6% | Measures whether the PDP sells. |
| Median admin approval turnaround | < 24 h | The single biggest determinant of seller retention. |
| Leads per active seller per month | ≥ 3 | Below this sellers stop logging in and the catalogue rots. |
| Mobile LCP (p75, field) | < 2.5 s | Half the traffic will be mid-range Android on 4G. |
| PWA install rate among repeat buyers | ≥ 15% | Validates the PWA-instead-of-native bet. |

## 7. Non-goals for v1

Recommendation engines, seller subscriptions, promoted listings, RFQ auctions, in-app chat,
multi-language, buyer verification badges, and anything involving money. Each is a real product in
its own right; adding any of them to a 7-week MVP would sink it.
