# 10 — Decisions, Assumptions & Change Log

## A. Resolved decisions

Confirmed by the client on 2026-09-08. These are now binding; changing one becomes a CR.

| # | Question | **Decision** | Consequence |
|---|---|---|---|
| D-01 | Signed scope — ₹1,00,000 or ₹1,20,000? | **₹1,00,000** | See §C — the feature set must be trimmed or the fee revisited, because scope has since grown. |
| D-02 | Buyer verification channel | **Both** — phone OTP *and* email verification | Buyer picks. Removes the DLT lead-time risk from the critical path entirely. |
| D-03 | Is "Community" a restricted membership? | **Most sellers will belong to a specific community**, but not all | Open registration + an optional membership field + an admin-granted **Community Verified** badge. Not a hard gate. ⚠️ See Q-01. |
| D-04 | Does editing a company name require re-approval? | **Yes** | Profile returns to review on name change. |
| D-05 | Do price/MOQ-only edits skip re-review? | **No — every product edit requires re-approval** | Simpler than the planned exception. The `Setting` flag is removed. ⚠️ See the operational warning below. |
| D-06 | Seller lead CSV export? | **Yes** | In scope. |
| D-07 | Multiple admin accounts? | **Yes, needed from launch** | Adds admin user management + roles (Super Admin / Admin / Moderator). Was previously P2. |
| D-08 | Cap on contact reveals per buyer per day? | **No cap** | Abuse rate-limiting is retained (see below) but no product-level cap. |
| D-09 | Admin lead-notification cadence | **10-minute digest** | Seller notifications stay immediate; admin lead digest batches every 10 minutes. |
| D-10 | Domain ownership | **Client owns the registrar account** | Vendor gets delegated access. |
| D-11 | Hosting budget | **Absolute minimum viable** | New minimal stack in `02-ARCHITECTURE.md` §9. ~₹500–700/month all-in. |
| D-12 | Backend runtime | **Node.js** | Next.js 15 on Node 22 — one Node process serving both the app and `/api/v1`. No separate Express service. ⚠️ See Q-02. |
| D-13 | Brand assets, copy, legal text | **Client provides; vendor may improvise** | Vendor ships plausible placeholders and refines on delivery. No blocking. |
| D-14 | Category taxonomy | **Open and fully admin-customisable; unlimited categories** | No fixed seed taxonomy. Admin creates and edits freely. ⚠️ See Q-03 on depth. |
| D-16 | Dark mode in v1? | **Yes, both themes** | Tokens already exist. |
| D-17 | Analytics | **GA4** (free) | Funnel events per `01-PRD.md` §6. |
| D-18 | Email sending domain + DNS | **Client to share later** | ⚠️ **Hard-required by Phase 4.** See the warning below. |
| D-19 | **Seller subscriptions** *(new)* | **Yes — annual, per seller** | Major addition. Full spec in `01-PRD.md` §4.8. |

### Operational warning on D-05

Requiring re-approval for *every* edit — including fixing a typo or swapping one photo — means a
seller's live listing disappears from the public site until an admin re-approves it. At ten products
per seller and 150 sellers, this generates real daily admin volume, and sellers will complain that
correcting a price cost them a day of visibility.

Built as instructed. Two mitigations included at no extra cost, both admin-controlled:

1. **Edits stay live while pending re-approval** (a `PENDING_EDIT` state on an already-approved
   product: the previously approved version remains public until the new version is approved or
   rejected). This preserves full editorial control while removing the visibility penalty.
2. A **"Recently edited"** filter pinned at the top of the moderation queue so re-approvals are a
   ten-second scan rather than a full review.

Recommend enabling mitigation 1. If you want the strict behaviour — edited products go dark
immediately — say so and it becomes a one-line config change.

### Operational warning on D-08

No product-level cap is implemented. Abuse-level rate limiting stays (60 reveals/hour per account,
200/hour per IP) purely to stop automated scraping. The vetted seller list is the client's core
business asset, and without *some* ceiling a competitor can enumerate every seller's phone number
overnight for the price of a few hundred OTP SMS. These limits are far above any real buyer's
behaviour and no genuine user will ever encounter them.

### Standing warning on D-18

Until the sending domain and DNS access arrive, email authentication (SPF, DKIM, DMARC) cannot be
configured. Without it, seller approval emails, lead notifications and subscription renewal reminders
land in spam. **The product will appear to work perfectly and produce no business result.**

Needed by **start of Phase 4** at the latest. Development proceeds on a vendor-owned test domain
until then.

## B. Questions still open

Each has a default so nothing blocks.

| # | Question | Default if unanswered | Needed by |
|---|---|---|---|
| Q-01 | What identifies community membership — an association name, a membership number, an uploaded document, or a referral by an existing member? | Optional free-text "Community / association" field + optional membership ID, verified manually by the admin, who grants a **Community Verified** badge | Phase 1 |
| Q-02 | D-12 read as "any Node.js runtime is fine, Next.js included". If you specifically meant *Node + Express as two services*, say so now. | Next.js on Node 22, single process | Before Phase 0 |
| Q-03 | Category depth — two levels (group → category) or three? | **Two.** The schema is self-referential so depth is a constant; going to three later is a small change plus UI work | Phase 1 |
| Q-04 | **What does a subscription actually gate?** | Product listing capacity + featured placement. **Lead access stays free on every plan** — see `01-PRD.md` §4.8 for why | Phase 2 |
| Q-05 | Subscription payment collection — manual (admin records a UPI/bank payment) or self-serve online (Razorpay)? | **Manual for v1**, self-serve as CR-002 | Phase 2 |
| Q-06 | Plan names and annual prices | Vendor seeds three plans; client edits them in the admin panel before launch | Phase 6 |
| Q-07 | Does the client have a GSTIN, and must subscription receipts be GST tax invoices? | Plain numbered receipts, no GST breakup | Phase 2 |
| Q-08 | Free/discounted founding-member period for early sellers? | **Yes — free first year for the first 100 sellers.** Central to the launch plan in `11-MARKETING-GTM.md` | Phase 2 |

## C. Scope has grown past the signed fee — read this

₹1,00,000 was signed (D-01). Per `00-SCOPE-RECONCILIATION.md` §B5, that figure already implied
trimming roughly ₹20,000 of the larger quotation's feature set. Since then, four additions have
landed:

| Addition | Source | Est. effort |
|---|---|---|
| Annual seller subscriptions (manual payment) | D-19 | 4–5 days |
| Multiple admin accounts with roles | D-07 | 1–1.5 days |
| Community verification field + badge | D-03 | 0.5 day |
| Dual verification (email *and* OTP) | D-02 | 0.5 day |
| Founding-member / waitlist landing page | Q-08, marketing | 0.5 day |
| *(saving)* Uniform re-approval removes the conditional-edit logic | D-05 | −0.5 day |
| **Net** | | **≈ +6.5–7.5 days** |

Against a ~25-day engineering plan, that is roughly **+30%**. Three honest ways to absorb it — this
is the client's call, not the vendor's:

1. **Extend to 8.5 weeks** and keep everything. Cleanest.
2. **Hold 7 weeks and drop:** Web Push notifications, the in-app notification centre (email only),
   and PUB-08 "post your requirement". Roughly the right size. Dark mode is *not* on this list —
   it is nearly free once tokens exist.
3. **Hold 7 weeks and full scope** by raising the fee toward the ₹1,20,000 originally quoted.

**Recommendation: option 1.** Subscriptions are the revenue model; shipping them properly is worth
six working days, and they also make the hosting cost self-funding.

Whichever is chosen, decide before Phase 2 — that is when the subscription work starts and the
timeline commitment becomes real.

## D. Assumptions

1. English only. No Hindi or regional-language UI.
2. India only — INR, Indian states, `+91` default.
3. Thousands of products in year one, not hundreds of thousands.
4. Sellers upload their own products; no bulk import, no data-entry service.
5. The admin approves within about a day — including the higher re-approval volume from D-05.
6. No integration with any existing client system (CRM, ERP, member database).
7. Hosting, domain and email live in the client's own accounts, with vendor access delegated.
8. Subscription revenue is collected by the client directly; the vendor never touches funds.

## E. Change request log

| CR | Date | Request | Est. effort | Status | Decided by |
|---|---|---|---|---|---|
| CR-001 | 2026-09-08 | Annual seller subscriptions, manual payment recording | 4–5 days | **Approved** (D-19) | Client |
| CR-002 | — | Self-serve online subscription payment (Razorpay: UPI/cards/netbanking, webhooks, auto-activation, GST tax invoices) | 4–5 days | **Proposed** — quote separately | — |
| CR-003 | — | Programmatic city × category SEO landing pages (`11-MARKETING-GTM.md` §5) | 2–3 days | **Proposed** — highest-ROI marketing addition | — |
| CR-004 | — | Seller referral tracking with subscription credit | 1.5 days | **Proposed** | — |
| CR-005 | — | WhatsApp notifications via Meta Business API | 3 days + per-message cost | Deferred | — |
| CR-006 | — | Bulk product import (CSV/Excel) | 2–3 days | Deferred | — |

Process: log it → estimate within 2 working days → written client approval → schedule into a phase.
An unapproved CR is never built.

## F. Likely post-launch roadmap

Razorpay self-serve billing (CR-002) · programmatic SEO pages (CR-003) · referrals (CR-004) ·
WhatsApp notifications · bulk import · buyer requirement board · seller analytics (views, lead
sources, conversion) · saved searches with alerts · verified-seller document checks · ratings and
reviews · regional-language UI.

The schema in `03-DATA-MODEL.md` accommodates most of these without migration pain — `Setting`,
`AuditLog`, `LeadEvent`, the self-referential category tree and the plan-based subscription model
all exist partly to keep those doors open.
