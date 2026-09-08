# 07 — Phase-Wise Development Plan

Seven phases over **8.5 calendar weeks** — the original 7 plus the ~6.5–7 engineering days added by
the client decisions of 2026-09-08 (annual subscriptions, multiple admin accounts, community
verification, dual verification). See `10-OPEN-DECISIONS.md` §C for the two alternatives if 7 weeks
is a hard commitment.

AI-assisted build should finish the engineering inside 6 weeks; the remainder is deliberately
reserved for client review latency and the rework that approval-workflow products always generate.
Do not spend the buffer early.

**Exit gates are binary.** A phase is not done until every box is ticked, `pnpm verify` is green on
`main`, and the demo has been shown. Half-finished phases compound; this is the discipline that
keeps an AI build from becoming a pile of 80%-complete features.

---

## Phase 0 — Foundations (Week 1, days 1–3)

**Goal: an empty but *deployed* application, with every guardrail in place before a single feature
exists.** This is the phase people skip and the one that determines whether AI-generated code stays
coherent for seven weeks.

Deliverables:
- pnpm monorepo, Next.js 15 + TS strict, Tailwind v4, ESLint (incl. the no-hex-literal rule from
  `05-DESIGN-SYSTEM.md` §3), Prettier, Husky + lint-staged.
- `packages/tokens` → generated `tokens.css` + Tailwind theme, both committed.
- shadcn/ui installed and **restyled to our tokens**: Button, Input, Select, Dialog, Sheet, Table,
  Badge, Toast, Dropdown, Tabs, Card, Skeleton.
- Prisma schema from `03-DATA-MODEL.md`, first migration, full `seed.ts`.
- `docker-compose.yml` (Postgres + app), `.env.example`, zod-validated `env.ts`.
- Auth.js scaffold with the three roles; route-group middleware guarding `(seller)` and `(admin)`.
- Error contract, `requestId` middleware, Sentry, `/api/health`.
- Layout shells: public header/footer/tab-bar, seller shell, admin shell — all navigable, no content.
- CI: typecheck → lint → unit → build → E2E → Lighthouse budget.
- **Deploy the empty app to the production VPS.** Domain, TLS, Cloudflare, backup cron.

**Exit gate**
- [ ] `pnpm verify` green in CI
- [ ] The live URL serves the shell over HTTPS
- [ ] `pnpm db:seed` produces the fixture set from `03-DATA-MODEL.md` §5
- [ ] Logging in as each of the three seeded roles lands on the correct shell
- [ ] A nightly `pg_dump` has run and been downloaded once
- [ ] Storybook (or a `/dev/components` page) renders every primitive in light and dark

> Deploying on day 3 rather than week 6 is the highest-leverage decision in this plan. Deployment
> problems found in week 6 eat the buffer; found on day 3 they cost an afternoon.

---

## Phase 1 — Identity, categories & the approval spine (Week 1 day 4 → Week 2 day 3)

**Goal: an admin can approve a seller, assign categories, and that seller can log in and see them.**
The approval spine touches every later feature, so it is built first and hardened.

Deliverables:
- Seller registration (SEL-01) with logo upload and category request.
- Login/logout, forgot/reset password (SEL-03, SEL-04), with the anti-enumeration behaviour.
- Seller status screens: pending, rejected (with reason), deactivated.
- Admin: seller list with filters, seller detail, approve/reject/activate/deactivate (ADM-02).
- **Multiple admin accounts (ADM-10, D-07)**: invite flow, three role levels, `requireAdminLevel`
  guard, last-super-admin protection.
- **Community fields + verified badge (ADM-11, D-03)**: optional association name and membership ID
  on registration, admin grant/revoke.
- Admin: category CRUD + reorder + two-level tree (ADM-03).
- Admin: seller↔category assignment with the affected-products warning (ADM-04).
- The seller state machine (`03-DATA-MODEL.md` §4.1) in `policy.ts`, with the illegal-transition test.
- `AuditLog` writing inside every admin mutation's transaction (ADM-09).
- Email infrastructure: Resend, React Email base template, pg-boss queue with retries, `EmailLog`.
- Transactional emails: seller approved, seller rejected, categories assigned, password reset.

**Exit gate**
- [ ] Full journey works on the live URL: register → admin approves with categories → approval email
      arrives → seller logs in and sees exactly those categories
- [ ] Rejection carries the reason through to the email and the seller's screen
- [ ] Deactivate/reactivate restores the prior status without re-approval
- [ ] Every illegal seller transition returns 409, covered by unit tests
- [ ] Password reset token is single-use and invalidates other sessions
- [ ] A moderator receives 403 from `/admin/plans` at the **API**, not just a hidden nav item
- [ ] The last active super-admin cannot be deleted or demoted
- [ ] A failed email send retries and is visible in `EmailLog` without breaking the request

---

## Phase 2 — Catalogue: products, images, moderation (Week 2 day 4 → Week 3 day 3)

**Goal: a seller can list a product and an admin can approve it.**

Deliverables:
- Seller product CRUD (SEL-07, SEL-08) with all fields from `01-PRD.md` §4.4.
- **Category enforcement (SEL-10)** — server-side, with its own test file. The single most likely
  authorisation gap in the project.
- Image pipeline (SEL-09): presigned R2 upload, client-side compression, magic-byte verification,
  sharp → WebP at four sizes, EXIF strip, blurhash, reorder, delete-guard on the last image.
- Product state machine (`03-DATA-MODEL.md` §4.2) including the edit-returns-to-pending rule and its
  `Setting`-driven exception for price/MOQ/image-only edits.
- Admin moderation queue with bulk approve (ADM-05).
- Notifications: product approved / rejected / new submission (NOT-03, NOT-04, NOT-08).
- Seller product list with status filters and empty states, including the zero-categories case.

**Exit gate**
- [ ] Seller adds a product with 4 phone photos; images are WebP, EXIF-free, and four sizes exist
- [ ] Posting into an unassigned category returns 403 even when the API is called directly
- [ ] Editing an approved product's description delists it; editing only its price does not
- [ ] Bulk-approving 20 products works and is idempotent
- [ ] Soft-deleting a product with leads preserves the lead and its `productNameAtInquiry`
- [ ] Upload of a `.exe` renamed to `.jpg` is rejected server-side

---

## Phase 2b — Subscriptions (Week 3 days 4–5 → Week 4 day 2) · **new, CR-001**

**Goal: the revenue model works end to end without anyone touching a payment gateway.**

Placed here deliberately: it needs products (Phase 2) so limits mean something, and it must precede
Phase 3 so the public catalogue respects subscription-based visibility from the first line of code
rather than having it retrofitted.

Deliverables:
- `Plan` CRUD, super-admin gated (SUB-01), with three seeded plans.
- `Subscription` + `SubscriptionPayment` + `SubscriptionReminder` models and the lifecycle state
  machine (`03-DATA-MODEL.md` §4.4).
- **`computeTerm()`** with exhaustive boundary tests — early renewal, lapsed renewal, UTC/IST
  day-boundary, leap year.
- Admin: record a payment, change plan, cancel, goodwill extend, subscriber list, expiring-soon CSV
  (SUB-03, SUB-09).
- Plan-limit enforcement on product create **and** re-approval (SUB-05), with a real upgrade prompt
  rather than a bare error.
- Nightly expiry sweep + reminders at T-30/14/7/1, expiry, grace end (SUB-06), idempotent by unique
  constraint.
- Seller billing page with usage bars and payment history (SUB-07).
- Sequential gap-free receipt numbering + PDF (SUB-08).
- Founding-member programme as a ₹0 `TRIALING` subscription (SUB-10) — no special-case code.

**Exit gate**
- [ ] Recording a renewal 30 days early extends from the old expiry, not from today
- [ ] Recording a renewal on a lapsed subscription starts the term today
- [ ] An expired seller's listings vanish from public view within 60 s; their **lead inbox still
      works** and nothing is deleted
- [ ] A seller in grace is still publicly visible and sees the banner
- [ ] Free-tier seller is blocked at the 6th product with a plan-comparison prompt
- [ ] Lowering a plan's limit does not retroactively hide an existing subscriber's products
- [ ] Receipt numbers are sequential with no gaps after a deliberately rolled-back transaction
- [ ] Reminder worker run twice sends each reminder exactly once
- [ ] Every automatic expiry writes an `AuditLog` row

## Phase 3 — Public marketplace & search (Week 4 day 3 → Week 5 day 2)

**Goal: the public site is live, fast, indexable, and contact is provably hidden.**

Deliverables:
- Home (PUB-01), listing with URL-state filters (PUB-02), product detail (PUB-03), seller profile
  (PUB-04), category pages.
- Search (SRC-01…04): `tsvector` migration, trigram fallback, composed filters, pagination.
- `ProductCard`, `FilterBar`, `ImageGallery`, `Breadcrumbs`, `Pagination`, `EmptyState`, skeletons.
- **`toPublicSeller()` serialiser + the no-contact-in-payload test** (`04-API-SPEC.md` §2.1).
- Visibility fragment including the subscription clause, with boundary-date tests.
- Community Verified badge on cards and profiles; featured-plan priority in listing sort.
- Public pricing page from `GET /plans`, and the founding-member / early-access landing page
  (`11-MARKETING-GTM.md` §2).
- SEO (PUB-06): metadata, JSON-LD, sitemap with tag revalidation, robots.
- CMS pages (PUB-05, ADM-07) with server-side sanitisation, and the Contact-Us form.
- ISR + Cloudflare caching per `04-API-SPEC.md` §8.

**Exit gate**
- [ ] Automated test: no product/seller/category API response contains a phone or email substring
      for any fixture
- [ ] Filters compose, survive refresh and back, and are shareable by URL
- [ ] "bering" returns bearing products (trigram fallback proven)
- [ ] Lighthouse mobile on product detail: Perf ≥ 90, A11y = 100, SEO ≥ 95
- [ ] Approving a product makes it publicly visible within 60 s
- [ ] Deactivating a seller removes all their products from public view within 60 s
- [ ] An expired seller's products are absent from search, category pages and sitemap
- [ ] axe reports zero violations across all public pages

---

## Phase 4 — Leads, verification & notifications (Week 5 day 3 → Week 6 day 3)

**The revenue phase.** Everything before this was scaffolding for it.

Deliverables:
- `ContactGate` component in all its states (`05-DESIGN-SYSTEM.md` §6.4).
- Inquiry submission → challenge → verification → reveal (LEAD-01…04) over **both channels (D-02)**:
  phone OTP and email, with a "verify by email instead" switch, and the `console` provider so E2E and
  local dev need no SMS spend.
- MSG91 integration. **DLT template registration should still start in week 1**, but with the email
  channel fully built (D-02) a delay no longer blocks launch.
- Silent buyer account creation + session; "My Inquiries" (LEAD-08).
- Dedupe (LEAD-06) and rate limits (LEAD-07).
- Seller lead inbox: list, detail, status changes, notes, CSV export (SEL-11).
- Admin lead management with filters and export (ADM-06).
- Seller dashboard with stats and the 30-day sparkline (SEL-05).
- Admin dashboard with all seven counts and the attention queue (ADM-01).
- In-app notification centre (SEL-12, ADM-08), the **10-minute admin lead digest (D-09)** with
  empty-digest suppression, and remaining emails (NOT-05, NOT-09).
- Funnel analytics events (SYS-07).

**Exit gate**
- [ ] CUJ-1 completes on a real phone in under 90 seconds
- [ ] Seller and admin are both notified within 60 s of verification
- [ ] An unverified inquiry never notifies anyone and is purged after 24 h
- [ ] A second inquiry on the same product within 24 h increments `repeatCount` and does not re-notify
- [ ] Six OTP attempts burn the challenge and return 429
- [ ] The OTP code appears in no log, response body, or Sentry event
- [ ] Killing the email provider (bad API key) still creates the lead
- [ ] Dashboard figures reconcile against direct SQL counts

---

## Phase 5 — PWA, performance & accessibility (Week 6 days 4–5)

Deliverables: everything in `06-PWA-SPEC.md` — manifest, icons incl. maskable, screenshots, Serwist
caching rules, offline page, install prompt logic, Web Push with contextual permission, iOS
instruction card, safe areas, draft autosave. Plus the performance pass (bundle analysis, dynamic
imports for admin charts and the rich-text editor, font subsetting, image sizes audit) and the
accessibility pass (keyboard-only walkthrough of all three CUJs, screen-reader check of the inquiry
flow, focus-order audit, reduced-motion verification).

**Exit gate**
- [ ] Every box in `06-PWA-SPEC.md` §8
- [ ] Field-realistic Lighthouse mobile: LCP < 2.0 s, CLS < 0.1, INP < 200 ms
- [ ] Initial JS on the public route < 200 KB gzipped
- [ ] Keyboard-only completion of all three CUJs
- [ ] Both themes verified against the token tables in `05-DESIGN-SYSTEM.md`

---

## Phase 6 — Hardening, QA, UAT & launch (Weeks 7–8.5)

Deliverables:
- Full regression pass on the matrix in `09-QA-SECURITY-LAUNCH.md` §2.
- Security review against §3, including a role-escalation attempt suite: buyer→seller,
  seller→another seller's resources, seller→admin.
- Load test: 200 concurrent catalogue readers, 20 concurrent inquiry submissions.
- **Backup restore rehearsal into a scratch database, with the elapsed time recorded.**
- OpenAPI published at `/api/docs`; deployment guide; backup/recovery runbook; admin user manual
  with screenshots (Anita is not technical — this deliverable is not optional).
- Client UAT round, bug triage (P0/P1 fixed, P2 logged as CRs), fixes, re-test.
- Production content load: real categories, CMS copy, legal text reviewed, first sellers onboarded.
- Launch: DNS cutover, monitoring live, Sentry alerting, uptime pinger, smoke test.
- Handover: credentials transferred, walkthrough recorded, AMC terms confirmed.

**Exit gate**
- [ ] Zero P0/P1 defects open
- [ ] Restore rehearsal passed and timed
- [ ] All four documentation deliverables handed over
- [ ] Client sign-off on all three CUJs
- [ ] 48 hours in production with no P0 incident

---

## Dependency map

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 2b ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6
                            │           │           ▲
                            └───────────┴───────────┘
                         2b needs 2's products; 3 needs 2b's visibility rule
```
Phase 2b sits before Phase 3 on purpose: subscription state is part of the public visibility rule
(`03-DATA-MODEL.md` §2), and retrofitting a visibility clause across an already-built catalogue is
how sellers end up leaking into public results. Phases 2b and 3 can overlap partially across two
tracks once the visibility fragment itself is merged — see `08-AI-BUILD-PLAYBOOK.md` §4.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|:--:|:--:|---|
| **MSG91 DLT template approval delays** | High | ~~High~~ **Low** | Neutralised by D-02: the email channel is fully built, so a DLT delay costs a channel, not a launch date. Still start day 1. |
| **Subscription date arithmetic bug** hides a paying seller | Medium | **High** | One pure `computeTerm()` function, exhaustive boundary tests, live evaluation rather than a cached status column, `AuditLog` on every automatic change. In a small community, hiding a paying member's listings is a trust failure that outlives the bug. |
| **Sellers resist paying** at renewal | Medium | High | Leads-per-seller is the leading indicator (`01-PRD.md` §6); free tier keeps the catalogue full; founding-member year builds the habit before the first invoice. |
| Re-approval load from D-05 overwhelms the admin | Medium | Medium | `PENDING_EDIT` keeps listings live, and the moderation queue pins recent edits for fast scanning. Watch the queue depth in week 1 of production. |
| Client is slow to supply categories, logo, legal copy | High | Medium | Seed realistic placeholders in Phase 0; request real content in writing at the Phase 1 demo with a Phase 5 deadline. |
| Scope creep via approval-workflow requests ("add a status", "add a field") | High | High | CR log in `10-OPEN-DECISIONS.md`; nothing unlisted gets built without written approval. |
| Hosting budget gap (§D of doc 00) | Certain | Medium | Raise in week 0, before any hosting is bought. |
| Contact details leak through some endpoint | Medium | **Critical** | One serialiser, one test asserting across all fixtures, re-run every CI build. |
| AI agents produce inconsistent UI | Medium | Medium | Tokens + no-hex lint rule + shared primitives built in Phase 0 before any screen. |
| Image storage cost growth | Low | Low | R2 free tier ≈ 25–40k images; server-side re-encoding bounds file size. |
| Buyer OTP friction depresses conversion | Medium | High | Measured from day 1 (`01-PRD.md` §6). Below 40% verify rate, switch to email verification — a config flag, not a rebuild. |
| Single VPS is a single point of failure | Medium | Medium | Nightly off-box backups, an image that redeploys in minutes, and a documented restore. Accepted risk at this budget — state it in the handover. |
