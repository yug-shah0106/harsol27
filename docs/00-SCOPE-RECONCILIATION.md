# 00 — Scope Reconciliation & Commercial Reality Check

Two quotations were supplied and they do not describe the same product. This document fixes one
scope so the build cannot drift.

> **Updated 2026-09-08 after client sign-off.** ₹1,00,000 is the signed figure, and **annual seller
> subscriptions have been added** — a feature both original quotations explicitly excluded. The
> resolved scope below reflects every decision in `10-OPEN-DECISIONS.md` §A. The effort delta and
> the three options for absorbing it are in `10-OPEN-DECISIONS.md` §C.

## A. The two source documents

| | Quotation A ("Community B2B Marketplace Portal Development", Jash Jain) | Quotation B ("Commercial Quotation") |
|---|---|---|
| Price | ₹1,20,000 | ₹1,00,000 |
| Timeline | 1.5–2 months | 6.5–7 weeks (4 phases) |
| Hosting | 48 months for ₹11,282.69 + 1 yr free domain | Included, unspecified term |
| AMC (yr 2+) | ₹24,000/yr (20%) | ₹20,000/yr (20%) |
| Buyers | **No buyer account.** Buyer just fills an inquiry form. | **"Registration & Login"** listed as a buyer feature. |
| Tech stack | Not specified | React + TS, Node + Express, PostgreSQL, SendGrid/SES, AWS/DO |
| Notifications | Fully enumerated (6 seller + 3 admin triggers) | "Email notifications" only |
| CMS pages | About, Contact, Privacy, T&C — admin-editable | Same |
| Product fields | Name, category, description, multiple images, price (optional), MOQ (optional), city, state | "Multiple images per product" only |
| Deliverables | Not itemised | Swagger docs, deployment guide, backup/recovery procedure |

## B. Resolved scope — the union, with conflicts decided

The build follows the **union** of both documents, since both were shown to the client. Conflicts
resolve as follows.

### B1. Buyer accounts — resolved

Quotation A hides seller contact behind an anonymous form. Quotation B says buyers register and log
in. **Resolved (D-01/D-02): a middle path — "verified guest inquiry", with the buyer choosing either
verification channel.**

- A buyer browses, searches and views product detail with **no account**. This protects SEO and
  removes the single biggest drop-off in Indian B2B lead funnels.
- To reveal seller contact, the buyer submits the inquiry form and verifies **one** channel of their
  choosing — **phone OTP or email link**. Both are built; the buyer picks.
- On successful verification the system silently creates a lightweight `BUYER` account keyed to that
  phone or email and sets a session. The buyer never sees a "sign up" wall, but from the second
  inquiry onward they are logged in and get a real "My Inquiries" page.
- A full email+password buyer login exists for returning buyers who want it.

This satisfies both quotations, prevents contact scraping, and kills junk leads — the number one
complaint sellers have about IndiaMART-style portals.

**Why building both channels was the right call.** It costs roughly half a day more than one channel
and it removes the project's most likely external blocker: MSG91 DLT template approval takes 3–7
working days and is outside the vendor's control. With email verification fully built, a DLT delay
can no longer hold up launch. It also gives buyers without reliable SMS a path through, and it gives
the client a lever if SMS cost ever becomes a concern — SMS runs ~₹0.12–0.20 per message, so 1,000
inquiries/month is ₹150–200.

### B2. Notifications

Quotation A's enumerated list wins because it is the more specific of the two. Every trigger below
is in scope as **email + in-app bell**:

Seller: registration approved, registration rejected, product approved, product rejected, new lead
generated, category assigned.
Admin: new seller registration, new product submission, new lead generated.

Web Push (PWA) is added on top for the same triggers — see `06-PWA-SPEC.md`. WhatsApp notification
is **out of scope** (requires a Meta Business account, template approval and per-message cost);
listed as a Phase 2 add-on.

### B3. Product fields

Quotation A's field list wins (it is a superset). Price and MOQ are **optional and display-only** —
the platform never validates, compares or transacts on price, consistent with Quotation B's
"Important Clarifications".

### B4. Deliverables

Quotation B's deliverables list wins and is treated as contractual: OpenAPI/Swagger documentation, a
deployment guide, and a documented backup/recovery procedure. These are exit-gate items in
`07-ROADMAP.md` Phase 6, not optional extras.

### B5. Timeline and price

Quote the **client-facing** timeline from Quotation B: 6.5–7 weeks to production. `07-ROADMAP.md`
plans to that number. AI-assisted build should land materially inside it; the slack is deliberate
buffer for client review latency (approval workflows always generate rework), not padding.

**₹1,00,000 is the signed figure (D-01).** Scope has since grown by roughly 6.5–7.5 engineering
days — annual subscriptions, multiple admin accounts, community verification, dual verification, and
the founding-member landing page. That is about +30% against a ~25-day plan.

`10-OPEN-DECISIONS.md` §C sets out the three ways to absorb it: extend to 8.5 weeks (recommended),
hold 7 weeks and drop Web Push + the in-app notification centre + PUB-08, or hold 7 weeks at full
scope and revisit the fee. **This needs deciding before Phase 2 starts.**

## C. Explicitly OUT of scope

Stated so it cannot be assumed in later:

- Buyer-side payments, checkout, cart, escrow. GST calculation on subscription receipts is out
  unless Q-07 says otherwise.
- Order management, shipping, delivery tracking, returns.
- Ratings, reviews, or seller scoring.
- In-platform chat or messaging between buyer and seller (contact is by phone/email, off-platform).
- Native iOS/Android app-store apps. **The PWA is the mobile strategy** — see `06-PWA-SPEC.md`.
- Multi-language / multi-currency.
- ~~Seller subscription tiers~~ — **now IN scope** (D-19). See `01-PRD.md` §4.8. Paid *listings* and
  promoted placement beyond the plan-level featured flag remain out.
- **Online payment collection for subscriptions** — out for v1. Payments are recorded manually by the
  admin. Self-serve Razorpay checkout is CR-002.
- Bulk product import (CSV/Excel) — CR-006. Commonly requested late; quote separately.
- Any responsibility for pricing disputes, transaction disputes, fraud, delivery or product quality
  — the platform is a connector only. This must be reflected in the T&C page copy.

## D. Hosting — minimum viable, as instructed (D-11)

Quotation A prices hosting at **₹11,282.69 for 48 months = ₹235/month (~US$2.75)**. Quotation B
promises **"AWS / DigitalOcean, scalable for 500–1K users/month"**. Those two statements are not
compatible: ₹235/month is shared-cPanel pricing, and shared cPanel does not run a Node process,
a PostgreSQL instance and a background worker.

**Instruction received: keep hosting as low as possible.** The stack in `02-ARCHITECTURE.md` §9 is
built to that instruction, using free tiers wherever a free tier is genuinely production-grade:

| Component | Choice | Monthly |
|---|---|---|
| App + PostgreSQL + Caddy | One small VPS, 2 GB, Indian or Singapore region, Docker Compose | ₹450–1,000 |
| CDN, TLS, WAF, DDoS | Cloudflare free | ₹0 |
| Product images | Cloudflare R2 — 10 GB free, **zero egress** | ₹0 until ~30k images |
| Transactional email | Brevo (300/day) or Resend (3k/month) free tier | ₹0 |
| SMS OTP | MSG91, pay per message | ₹150–200 at 1k inquiries |
| Error tracking | Sentry free | ₹0 |
| Uptime monitoring | UptimeRobot free | ₹0 |
| CI/CD | GitHub Actions free | ₹0 |
| **Total** | | **≈ ₹600–1,200/month** |

Two techniques keep the VPS at the small end rather than the large:

1. **Build in CI, never on the server.** GitHub Actions builds the Docker image; the VPS only runs
   it. A Next.js production build is the single most memory-hungry thing this project does, and
   moving it off the box is what makes 2 GB comfortable instead of marginal.
2. **Cache the public catalogue at Cloudflare.** The read-heavy pages that carry almost all the
   traffic are served from the edge, so the origin handles very little.

**The gap remains, and it should be stated plainly:** ₹600/month over 48 months is ~₹28,800 against
₹11,283 quoted — a shortfall of roughly ₹17,500. Three ways to close it, in order of preference:

1. **Fund it from subscription revenue.** With D-19 now in scope the client has a revenue model.
   Even ten sellers at ₹2,000/year covers hosting for the life of the quotation. This is the real
   answer, and it is a much better conversation than the other two.
2. Re-quote hosting honestly at ~₹600/month from year two, with the first year as quoted.
3. Absorb it as a cost of sale.

**Do not silently buy shared hosting to hit the quoted number.** It will not run this application,
and discovering that during deployment week is the worst possible time.

Image storage is the only thing that grows without bound. R2's free 10 GB holds roughly 25,000–40,000
optimised product images at the sizes in `06-PWA-SPEC.md`; beyond that it is US$0.015/GB/month.

## E. Scope change control

Any request not listed in `01-PRD.md` follows the AMC exclusion clause both quotations already
carry: estimated and charged separately. The practical mechanism — log it in
`10-OPEN-DECISIONS.md` as a **CR-nnn** row with an estimate, and get written approval before an
agent touches it. Approval workflows are a magnet for "just one more status" requests; the CR log is
what keeps a 7-week project from becoming a 14-week one.
