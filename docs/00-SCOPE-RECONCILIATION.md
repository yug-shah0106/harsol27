# 00 — Scope Reconciliation & Commercial Reality Check

Two quotations were supplied and they do not describe the same product. This document fixes one
scope so the build cannot drift. **Anything in this file that is marked ⚠️ needs a client decision
before the phase that depends on it starts** — a recommended default is given for each so work
never blocks.

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

### B1. ⚠️ Buyer accounts — the one real product conflict

Quotation A hides seller contact behind an anonymous form. Quotation B says buyers register and log
in. These produce different products.

**Decision (recommended default): a middle path — "verified guest inquiry".**

- A buyer browses, searches and views product detail with **no account**. This protects SEO and
  removes the single biggest drop-off in Indian B2B lead funnels.
- To reveal seller contact, the buyer submits the inquiry form and verifies **one** channel —
  phone OTP (recommended) or email magic-link.
- On successful verification the system silently creates a lightweight `BUYER` account keyed to that
  phone/email and sets a session. The buyer never sees a "sign up" wall, but from the second inquiry
  onward they are logged in and get a real "My Inquiries" page.
- A full email+password buyer login exists for returning buyers who want it.

This satisfies both quotations, prevents contact scraping, and kills junk leads — the number one
complaint sellers have about IndiaMART-style portals.

**Cost of this decision:** an SMS OTP provider is required. Budget ~₹0.12–0.20 per SMS in India
(MSG91 / Fast2SMS / Twilio). At 1,000 inquiries/month that is ₹150–200/month. If the client refuses
this cost, fall back to **email-only verification** (free tier covers it) — see §D.

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

Which price applies (₹1,00,000 vs ₹1,20,000) is a commercial matter between the client and the
vendor and does not change the build plan. **The engineering scope below assumes the ₹1,20,000
feature superset.** ⚠️ If ₹1,00,000 was the signed figure, the honest move is to descope: drop Web
Push, drop the in-app notification centre (email only), and drop the analytics charts — that is
roughly the ₹20,000 delta.

## C. Explicitly OUT of scope

Stated so it cannot be assumed in later:

- Payments, checkout, cart, escrow, invoicing, GST calculation.
- Order management, shipping, delivery tracking, returns.
- Ratings, reviews, or seller scoring.
- In-platform chat or messaging between buyer and seller (contact is by phone/email, off-platform).
- Native iOS/Android app-store apps. **The PWA is the mobile strategy** — see `06-PWA-SPEC.md`.
- Multi-language / multi-currency.
- Seller subscription tiers, paid listings, or promoted placement.
- Bulk product import (CSV/Excel). ⚠️ Commonly requested late; quote separately if asked.
- Any responsibility for pricing disputes, transaction disputes, fraud, delivery or product quality
  — the platform is a connector only. This must be reflected in the T&C page copy.

## D. ⚠️ Hosting budget — flag this with the client now

Quotation A prices hosting at **₹11,282.69 for 48 months = ₹235/month (~US$2.75)**. Quotation B
promises **"AWS / DigitalOcean, scalable for 500–1K users/month"**. Those two statements are not
compatible. ₹235/month is shared-cPanel pricing; the smallest usable DigitalOcean droplet that runs
Node + PostgreSQL is roughly US$12–14/month (≈₹1,100/month).

Three honest options:

| Option | Monthly | 48-month total | Notes |
|---|---|---|---|
| **1. Budget VPS (recommended)** — Hostinger KVM2 / Contabo VPS, single box running app + Postgres + Caddy, Docker Compose | ₹450–700 | ₹21,600–33,600 | Comfortably handles 1K users/month. Shortfall vs quote: **₹10,000–22,000**. |
| **2. Managed PaaS** — Railway/Render app + managed Postgres | ₹1,400–2,200 | ₹67,000–105,000 | Zero ops burden, automatic backups, easiest handover. |
| **3. DigitalOcean as quoted** — 2GB droplet + managed Postgres | ₹2,300–3,000 | ₹110,000+ | Matches Quotation B's wording literally. Costs more than the entire dev fee. |

**Recommendation: Option 1.** Choose the VPS, add Cloudflare (free) in front for CDN, TLS and DDoS,
Cloudflare R2 for product images (10 GB free, zero egress fees), and a free-tier transactional email
provider. Then either absorb the ~₹10–20k shortfall as a cost of sale or re-quote hosting honestly
as ~₹600/month. Discovering this in month 30 is far worse than discussing it in week 0.

Storage note: product images are the one thing that grows without bound. R2's free 10 GB holds
roughly 25,000–40,000 optimised product images at the sizes specified in `06-PWA-SPEC.md`. Beyond
that it is US$0.015/GB/month — negligible.

## E. Scope change control

Any request not listed in `01-PRD.md` follows the AMC exclusion clause both quotations already
carry: estimated and charged separately. The practical mechanism — log it in
`10-OPEN-DECISIONS.md` as a **CR-nnn** row with an estimate, and get written approval before an
agent touches it. Approval workflows are a magnet for "just one more status" requests; the CR log is
what keeps a 7-week project from becoming a 14-week one.
