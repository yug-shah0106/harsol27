# 07 — Phase-Wise Development Plan

Seven phases over **7 calendar weeks**, matching Quotation B's committed 6.5–7 weeks. AI-assisted
build should finish the engineering inside 5; the remaining time is deliberately reserved for client
review latency and the rework that approval-workflow products always generate. Do not spend the
buffer early.

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

## Phase 3 — Public marketplace & search (Week 3 day 4 → Week 4 day 3)

**Goal: the public site is live, fast, indexable, and contact is provably hidden.**

Deliverables:
- Home (PUB-01), listing with URL-state filters (PUB-02), product detail (PUB-03), seller profile
  (PUB-04), category pages.
- Search (SRC-01…04): `tsvector` migration, trigram fallback, composed filters, pagination.
- `ProductCard`, `FilterBar`, `ImageGallery`, `Breadcrumbs`, `Pagination`, `EmptyState`, skeletons.
- **`toPublicSeller()` serialiser + the no-contact-in-payload test** (`04-API-SPEC.md` §2.1).
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
- [ ] axe reports zero violations across all public pages

---

## Phase 4 — Leads, verification & notifications (Week 4 day 4 → Week 5 day 3)

**The revenue phase.** Everything before this was scaffolding for it.

Deliverables:
- `ContactGate` component in all its states (`05-DESIGN-SYSTEM.md` §6.4).
- Inquiry submission → OTP challenge → verification → reveal (LEAD-01…04), with the
  `OTP_PROVIDER=console` path so E2E and local dev need no SMS spend.
- MSG91 integration. ⚠️ **DLT template registration must have been started in week 1** — it takes
  3–7 working days and is the most likely external blocker in the whole plan.
- Silent buyer account creation + session; "My Inquiries" (LEAD-08).
- Dedupe (LEAD-06) and rate limits (LEAD-07).
- Seller lead inbox: list, detail, status changes, notes, CSV export (SEL-11).
- Admin lead management with filters and export (ADM-06).
- Seller dashboard with stats and the 30-day sparkline (SEL-05).
- Admin dashboard with all seven counts and the attention queue (ADM-01).
- In-app notification centre (SEL-12, ADM-08) and remaining emails (NOT-05, NOT-09).
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

## Phase 5 — PWA, performance & accessibility (Week 5 days 4–5)

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

## Phase 6 — Hardening, QA, UAT & launch (Weeks 6–7)

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
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──┐
                            │                 ├──► Phase 4 ──► Phase 5 ──► Phase 6
                            └─────────────────┘
```
Phase 3 (public catalogue) and Phase 4 (leads) both need Phase 2's products. Phase 4's UI attaches
to Phase 3's product detail page, so 3 must land first. Phases 3 and 4 can partially overlap across
two parallel workstreams once Phase 2's exit gate is met — see `08-AI-BUILD-PLAYBOOK.md` §4.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|:--:|:--:|---|
| **MSG91 DLT template approval delays** | High | High | Start day 1. `OTP_PROVIDER=email` fallback is fully built, so launch is never blocked on it. |
| Client is slow to supply categories, logo, legal copy | High | Medium | Seed realistic placeholders in Phase 0; request real content in writing at the Phase 1 demo with a Phase 5 deadline. |
| Scope creep via approval-workflow requests ("add a status", "add a field") | High | High | CR log in `10-OPEN-DECISIONS.md`; nothing unlisted gets built without written approval. |
| Hosting budget gap (§D of doc 00) | Certain | Medium | Raise in week 0, before any hosting is bought. |
| Contact details leak through some endpoint | Medium | **Critical** | One serialiser, one test asserting across all fixtures, re-run every CI build. |
| AI agents produce inconsistent UI | Medium | Medium | Tokens + no-hex lint rule + shared primitives built in Phase 0 before any screen. |
| Image storage cost growth | Low | Low | R2 free tier ≈ 25–40k images; server-side re-encoding bounds file size. |
| Buyer OTP friction depresses conversion | Medium | High | Measured from day 1 (`01-PRD.md` §6). Below 40% verify rate, switch to email verification — a config flag, not a rebuild. |
| Single VPS is a single point of failure | Medium | Medium | Nightly off-box backups, an image that redeploys in minutes, and a documented restore. Accepted risk at this budget — state it in the handover. |
