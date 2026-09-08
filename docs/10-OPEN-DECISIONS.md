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
| D-19 | **Seller subscriptions** *(new)* | **Yes — annual, per seller** | Full spec in `01-PRD.md` §4.7. |
| Q-04 | What does a subscription gate? | **Nothing at feature level. No payment handling.** An admin-managed annual validity window; on lapse the seller's listings come off the public site, and that is the only effect | Cuts the module from ~4–5 days to ~2 and brings the schedule back to 7.5 weeks. |

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
| Q-02 | D-12 read as "any Node.js runtime is fine, Next.js included". If you specifically meant *Node + Express as two services*, say so now. | Next.js on Node 22, single process. Rationale and the Next/Nest/Express comparison: `02-ARCHITECTURE.md` §1.1 | Before Phase 0 |
| Q-03 | Category depth — two levels (group → category) or three? | **Two.** The schema is self-referential so depth is a constant; going to three later is a small change plus UI work | Phase 1 |
| Q-08 | Free/discounted founding-member period for early sellers? | **Yes — free first year for the first 100 sellers.** Costs nothing to implement now that validity is admin-set; central to `11-MARKETING-GTM.md` | Phase 2b |
| Q-09 | Default validity term and grace period | **1 year, 15 days grace**, both editable per seller | Phase 2b |

**Resolved and closed:** Q-04 (gating — none), Q-05 (payment collection — none, off-platform),
Q-06 (plan names/prices — no plans exist), Q-07 (GST receipts — no receipts).

## C. Scope vs the signed fee

₹1,00,000 was signed (D-01). Per `00-SCOPE-RECONCILIATION.md` §B5, that figure already implied
trimming roughly ₹20,000 of the larger quotation's feature set. Additions and savings since:

| Change | Source | Est. effort |
|---|---|---|
| Subscription validity window (no plans, no payments) | D-19 + Q-04 | 1.5–2 days |
| Multiple admin accounts with roles | D-07 | 1–1.5 days |
| Community verification field + badge | D-03 | 0.5 day |
| Dual verification (email *and* OTP) | D-02 | 0.5 day |
| Founding-member / waitlist landing page | Q-08 | 0.5 day |
| *(saving)* Uniform re-approval removes the conditional-edit logic | D-05 | −0.5 day |
| **Net** | | **≈ +3.5–4.5 days** |

Against a ~25-day engineering plan that is **+15–18%**, and the schedule in `07-ROADMAP.md` now runs
**7.5 weeks** rather than the original 7.

Simplifying subscriptions (Q-04) is what recovered this. Plans, tiers, limit enforcement, payment
recording and receipt generation would have cost ~3 more days and roughly doubled the test surface of
that module.

Two ways to close the remaining half-week, if 7 weeks is a hard commitment:

1. **Accept 7.5 weeks.** Recommended — it is half a week against a fixed-scope build, and the buffer
   in Phase 6 exists precisely because client review latency is unpredictable.
2. **Drop Web Push** (`06-PWA-SPEC.md` §5). Roughly the right size, and email plus the in-app bell
   still cover every notification trigger. Push is the least load-bearing feature in the plan.

**Do not** recover it by cutting the Phase 6 hardening or the restore rehearsal.

## D. Assumptions

1. English only. No Hindi or regional-language UI.
2. India only — INR, Indian states, `+91` default.
3. Thousands of products in year one, not hundreds of thousands.
4. Sellers upload their own products; no bulk import, no data-entry service.
5. The admin approves within about a day — including the higher re-approval volume from D-05.
6. No integration with any existing client system (CRM, ERP, member database).
7. Hosting, domain and email live in the client's own accounts, with vendor access delegated.
8. Subscription money is collected entirely off-platform by the client. The application never
   processes, records or reconciles a payment — an admin simply extends a validity date once money
   has changed hands. ⚠️ This means the portal is **not** a record of who has paid; if the client
   later wants that, it is CR-002.

## E. Change request log

| CR | Date | Request | Est. effort | Status | Decided by |
|---|---|---|---|---|---|
| CR-001 | 2026-09-08 | Annual seller subscription validity, admin-managed, no payments | 1.5–2 days | **Approved** (D-19, Q-04) | Client |
| CR-007 | — | Plan tiers with feature gating (product limits, image limits, featured placement) | 3–4 days | **Deferred** by Q-04 | Client |
| CR-002 | — | Self-serve online payment (Razorpay: UPI/cards/netbanking, webhooks, auto-extension, GST tax invoices, receipts) | 4–5 days | **Deferred** — requires CR-007 first to be worth anything | — |
| CR-003 | — | Programmatic city × category SEO landing pages (`11-MARKETING-GTM.md` §5) | 2–3 days | **Proposed** — highest-ROI marketing addition | — |
| CR-004 | — | Seller referral tracking with subscription credit | 1.5 days | **Proposed** | — |
| CR-005 | — | WhatsApp notifications via Meta Business API | 3 days + per-message cost | Deferred | — |
| CR-006 | — | Bulk product import (CSV/Excel) | 2–3 days | Deferred | — |

Process: log it → estimate within 2 working days → written client approval → schedule into a phase.
An unapproved CR is never built.

## F. Likely post-launch roadmap

Plan tiers (CR-007) then Razorpay self-serve billing (CR-002) · programmatic SEO pages (CR-003) ·
referrals (CR-004) ·
WhatsApp notifications · bulk import · buyer requirement board · seller analytics (views, lead
sources, conversion) · saved searches with alerts · verified-seller document checks · ratings and
reviews · regional-language UI.

The schema in `03-DATA-MODEL.md` accommodates most of these without migration pain — `Setting`,
`AuditLog`, `LeadEvent`, the self-referential category tree and the append-only subscription term
history all exist partly to keep those doors open — adding plan tiers later means a `Plan` table and
a foreign key, not a rewrite.
