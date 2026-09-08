# 01 — Product Requirements Document

**Product:** Community B2B Marketplace Portal
**Version:** 1.0 (MVP)
**Status:** Client-confirmed 2026-09-08 (see `10-OPEN-DECISIONS.md` §A)
**Delivery form:** Responsive web application, installable as a PWA on Android and iOS
**Revenue model:** Annual seller subscriptions, collected off-platform; the portal tracks validity only

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
| View own validity dates & history | ❌ | ❌ | ✅ | ✅ | ✅ |
| Set or extend a seller's validity | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage admins & roles | ❌ | ❌ | ❌ | ❌ | ✅ super-admin |
| Publish a product without approval | ❌ | ❌ | ❌ | ❌ | ✅ |
| View own leads | ❌ | ❌ | ❌ | ✅ | ✅ |
| Approve / reject sellers & products | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage categories & assignments | ❌ | ❌ | ❌ | ❌ | ✅ |
| Edit CMS pages | ❌ | ❌ | ❌ | ❌ | ✅ |
| View all leads | ❌ | ❌ | ❌ | ❌ | ✅ |

A rejected or deactivated seller retains login but sees only a status screen; their products are
delisted from public view immediately and restored on reactivation. A seller whose **subscription has
expired** (past the grace period) keeps their account and data, and can still read their existing
leads — only their public listings are hidden and new product creation is blocked. Nothing is ever
deleted for non-payment.

**Admin roles (D-07).** Three levels: **Super Admin** (everything, including managing other admins,
plans and pricing), **Admin** (all day-to-day operations, cannot manage admins or change plan
pricing), **Moderator** (approve/reject sellers and products only; no lead export, no CMS, no
subscriptions). Every admin action is attributed in the audit log.

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
| LEAD-03 | P0 | **Verification gate (D-02)**: the buyer chooses **phone OTP** (6 digits, 10-min expiry, max 5 attempts, 60-second resend cooldown) **or email verification** (single-use link/code, 30-min expiry). Contact is revealed only after success. | Both channels fully built; the form offers a "verify by email instead" toggle. Unverified submissions are stored as `PENDING_VERIFICATION` and never notify the seller. Codes are stored hashed, never logged, never returned in an API response. |
| LEAD-04 | P0 | On verification the `Lead` is created and the seller's phone, email and full address are revealed on-screen, plus tap-to-call and WhatsApp deep links. | `tel:` and `https://wa.me/<e164>?text=<prefilled>` links work on mobile. Revealed contact persists for that buyer on return visits. |
| LEAD-05 | P0 | Lead notifies the seller and the admin. | Email within 60 s; in-app notification immediately; Web Push if subscribed. Notification failure is retried and never blocks lead creation. |
| LEAD-06 | P1 | Deduplication: the same buyer inquiring on the same product within 24 h updates the existing lead rather than creating a duplicate. | Second submission increments `repeatCount`, does not re-notify. |
| LEAD-07 | P1 | Anti-abuse rate limiting only — **no product-level cap on contact reveals (D-08)**: 60 reveals/hour per account, 200/hour per IP, 5 inquiry submissions/hour per phone. | Returns HTTP 429 with a human-readable message. Counters are server-side. Limits sit far above any genuine buyer's behaviour and exist solely to stop automated enumeration of the seller list. |
| LEAD-08 | P1 | Buyer "My Inquiries" page listing past inquiries with the revealed seller contact. | Accessible after the silent account creation in LEAD-03. |

### 4.4 Seller portal (`SEL`)

| ID | P | Requirement | Acceptance criteria |
|---|:--:|---|---|
| SEL-01 | P0 | **Registration**: company name, contact person, email, phone, password, city, state, GST/registration number (optional), **community/association name and membership ID (both optional, D-03)**, company description, logo, requested categories. | Email uniqueness enforced. Password ≥ 10 chars, checked against a common-password list. Submits as `PENDING`. Confirmation screen explains the approval wait. |
| SEL-02 | P0 | **Approval workflow**: admin approves or rejects with an optional reason; seller is emailed either way. | State machine in `03-DATA-MODEL.md` §4.1 is enforced server-side; illegal transitions return 409. |
| SEL-03 | P0 | **Login / logout**, session persists 30 days on "remember me", 12 h otherwise. | httpOnly + Secure + SameSite=Lax cookie. Logout invalidates server-side. |
| SEL-04 | P0 | **Forgot / reset password**: emailed single-use token, 30-minute expiry. | Token is hashed at rest, invalidated on use and on password change. Response is identical whether or not the email exists (no account enumeration). |
| SEL-05 | P0 | **Dashboard**: counts of total/approved/pending/rejected products, total leads, leads in last 30 days, a 30-day lead sparkline, and the 5 newest leads. | All figures scoped to the logged-in seller. Loads in <1.5 s. |
| SEL-06 | P0 | **Profile management**: edit company info, contact details, description, logo, city/state, community/association details. | Editing contact details does not require re-approval. **Editing the company name flags the profile for admin re-review (D-04)**; the previously approved name stays public until the change is approved. |
| SEL-07 | P0 | **Product management**: create, edit, delete (soft), and view status of own products. | **Every edit to an approved product requires re-approval (D-05)** — see `03-DATA-MODEL.md` §4.2. The approved version stays public while the edit is pending, so correcting a typo never costs a seller visibility. Delete is soft, preserving lead history. |
| SEL-08 | P0 | **Product fields**: name, category, description, 1–8 images, price (optional), price unit (optional), MOQ (optional), MOQ unit (optional), city, state. | Name 3–120 chars, description ≤ 4,000 chars. At least one image required. |
| SEL-09 | P0 | **Image upload**: multiple images, drag-to-reorder, first image is the thumbnail, client-side compression before upload. | Accepts JPEG/PNG/WebP/HEIC, max 10 MB each, 8 max. Server re-encodes to WebP at 1600/800/400/160 px. EXIF stripped. |
| SEL-10 | P0 | **Category access**: seller sees only admin-assigned categories and can post only into them. | Server rejects a product in an unassigned category with 403, regardless of what the client sends. A seller with zero assigned categories sees an explanatory empty state, not a broken form. |
| SEL-11 | P0 | **Lead inbox**: list own leads with buyer name, phone, email, product, message, date; detail view; mark as contacted/closed. | Sortable by date, filterable by status. **CSV export included (D-06)**, on every plan including Free. |
| SEL-12 | P1 | **Notification centre**: in-app bell with unread count for the six seller triggers. | Marking read is per-notification and bulk. |

### 4.5 Admin panel (`ADM`)

| ID | P | Requirement | Acceptance criteria |
|---|:--:|---|---|
| ADM-01 | P0 | **Dashboard**: total sellers, pending sellers, approved sellers, total products, pending products, approved products, total leads; plus a 30-day leads chart and an "needs your attention" queue. | Each stat tile links to its filtered list. Counts computed in a single query, cached 60 s. |
| ADM-02 | P0 | **Seller management**: searchable/filterable list; approve, reject (with reason), activate, deactivate; view full profile and their products and leads. | Deactivating hides the seller and all their products from public view within one cache cycle (≤60 s). |
| ADM-03 | P0 | **Category management (D-14)**: fully open and admin-customisable. Create, edit, delete, reorder; unlimited categories; name, slug, optional parent, optional icon/image, active flag. No fixed or vendor-imposed taxonomy. | Deleting a category with products is blocked with a clear message offering "reassign products first". Slug auto-generated, editable, unique. Two levels (group → category) per Q-03; depth is a constant, not a hardcoded assumption. Admin UI must stay usable at 200+ categories — search and grouped tree, not one long list. |
| ADM-04 | P0 | **Seller-category assignment**: assign and remove categories per seller, multi-select. | Removing a category that the seller has live products in prompts for confirmation and moves those products to `PENDING` (they are no longer permitted). |
| ADM-05 | P0 | **Product moderation queue**: list pending products with image preview; approve or reject with reason; bulk approve. | Queue is the admin landing default when non-empty. Approval is idempotent. |
| ADM-06 | P0 | **Lead management**: all leads with filters (date range, seller, category, status), detail view, CSV export. | Exports respect the active filter. |
| ADM-07 | P1 | **CMS management**: rich-text editing of the four static pages, with sanitisation. | Output HTML is sanitised server-side against an allowlist. Preview before publish. |
| ADM-08 | P1 | **Admin notifications**: in-app + email for new seller registration, new product submission, new lead. | Immediate for new sellers and new product submissions; **leads batch into a 10-minute digest (D-09)**. A digest with nothing in it is not sent. |
| ADM-09 | P1 | **Audit log**: who approved/rejected/deactivated what and when. | Immutable append-only table, visible on seller and product detail views. Cheap to build, and it is the first thing asked for when a dispute happens. |
| ADM-10 | **P0** | **Admin user management (D-07)**: super-admin invites admins by email, assigns one of three roles, deactivates them; each admin has their own login. | Role checks are enforced server-side per route, not only hidden in the UI. A super-admin cannot delete or demote the last remaining super-admin. Every admin action is attributed in `AuditLog`. |
| ADM-11 | P0 | **Community verification (D-03)**: admin reviews the seller's stated community/association and grants or revokes a **Community Verified** badge. | Badge renders on the seller profile and product cards. Independent of approval status — an unverified seller can still be approved. |

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

### 4.7 Seller subscriptions (`SUB`) — annual validity window, D-19 / Q-04

**Simplified by client decision (Q-04): a subscription gates nothing at feature level, and the
platform handles no payments.** It is an **annual validity window per seller, set and extended by an
admin.** No plans, no prices, no tiers, no product limits, no featured placement, no receipts, no
gateway.

What it does:

- Every approved seller has a `validUntil` date.
- While valid (plus a grace period), the seller is publicly listed and fully operational.
- When it lapses past grace, **their listings come off the public site.** Nothing else changes and
  nothing is deleted: they keep their login, their products, their full lead history and their lead
  inbox. An admin extends the date and everything returns.
- Sellers and admins get reminders before and at expiry.

That account-level expiry is the *only* enforcement in the system. It is also the point of the
feature — a validity date that has no effect would be a note, not a subscription. If you want expiry
to do nothing at all, say so and this becomes a display-only field.

Money is collected entirely off-platform, by whatever means the community office prefers, with no
record kept in the application beyond an optional free-text note on the term.

| ID | P | Requirement | Acceptance criteria |
|---|:--:|---|---|
| SUB-01 | P0 | **Admin sets a seller's validity window**: pick the seller, set `validFrom` and `validUntil` (defaulting to one year), add an optional note. | Idempotent. Writes an `AuditLog` row. Available from both the seller detail page and a dedicated subscriptions list. |
| SUB-02 | P0 | **Extend / renew**: extending an active seller **adds to the existing `validUntil`, never restarts from today.** Extending a lapsed seller starts from today. | The single most important rule in the module — a seller renewed early must not lose the months they already have. Own boundary tests. |
| SUB-03 | P0 | **Term history**: every window is retained as a row, so the admin can see when each renewal was recorded and by whom. | History is append-only; editing a term creates a correction entry rather than overwriting. |
| SUB-04 | P0 | **Lifecycle**: `ACTIVE → GRACE → EXPIRED`, plus `CANCELLED`. Grace period 15 days, configurable per seller. | During grace, listings stay public and the seller sees a persistent banner. On expiry, listings are hidden within 60 s and product creation is blocked. **Lead inbox and all data remain fully accessible.** |
| SUB-05 | P0 | **Reminders** at 30, 14, 7 and 1 days before expiry, on expiry day, and at grace end. | Email + in-app to the seller; the admin gets a weekly expiring-soon summary. Idempotent — a worker retry cannot resend. |
| SUB-06 | P1 | **Seller status strip**: current validity, days remaining, and a clear message on how to renew. | Approaching expiry is a warning state, not a failure state. |
| SUB-07 | P1 | **Admin subscriptions view**: active / in-grace / expired / expiring-in-30-days counts, filterable list, CSV export. | The export is the community office's renewal call sheet. |
| SUB-08 | P2 | **Bulk extend**: select many sellers, apply the same new `validUntil`. | Useful when payments are collected together at an annual meeting. |

**Notification triggers added** (extending §4.6): renewal reminder ×4, subscription expired, grace
ending, validity extended by an admin; and for the admin, a weekly expiring-soon summary.

**The failure mode to design against.** A date-arithmetic bug that hides a paying seller's listings
destroys trust in a way that is hard to recover from in a small community. Three defences are
mandatory: (1) the term calculation is a single pure function with exhaustive boundary tests;
(2) dates are stored UTC and evaluated in IST, with an explicit test for the case where those differ
across a day boundary; (3) every automatic expiry writes an `AuditLog` row, so "why did my listings
vanish?" is answerable in ten seconds.

> **What this decision saved.** Dropping plans, tiers, limit enforcement, payment recording and
> receipt generation takes this module from ~4–5 days to ~1.5–2. See `10-OPEN-DECISIONS.md` §C for
> what that does to the timeline. Plan-based gating remains straightforward to add later — the term
> model below does not block it — but nothing is being built for it now.

### 4.8 Cross-cutting (`SYS`)

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

**CUJ-4 — Seller renews.**
At 30 days out the seller gets a reminder; the admin's call sheet lists them. The seller pays the
community office off-platform. The admin opens the seller and extends the validity by a year — and
the new expiry extends from the *old* one, not from today, so the early renewal costs them nothing.
If they instead lapse, their listings come off the site at grace end, their lead inbox still works,
and one admin edit restores everything.

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
| Subscription renewal rate (year 2) | ≥ 70% | The real verdict on whether sellers got value. Leads per seller predicts this months in advance. |
| Sellers lapsing past grace | < 10% | Mostly a measure of whether reminders and the call sheet are being used. |

## 7. Non-goals for v1

Recommendation engines, promoted listings beyond the plan-level featured flag, RFQ auctions, in-app
chat, multi-language, buyer verification badges, ratings and reviews, and any buyer-side payment.

Seller subscriptions are **in** scope (§4.7) but in their minimal form: an admin-managed annual
validity window, no plans, no tiers, no feature gating and **no payment handling of any kind**.
Plan-based tiers (CR-007) and self-serve Razorpay billing (CR-002) are both deferred, and both are
genuinely separate pieces of work — with payments, it is webhooks, reconciliation, refunds, retries
and GST invoicing that consume the time, not the checkout button.
