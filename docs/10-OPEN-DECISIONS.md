# 10 — Open Decisions & Change Log

Every item has a **default** so that nothing blocks. If the client does not answer by the "needed
by" date, the default is implemented and the decision is closed. Reversing a closed decision later
becomes a CR.

## A. Decisions needed

| # | Question | Default if unanswered | Needed by | Impact if changed later |
|---|---|---|---|---|
| D-01 | **Which quotation is the signed scope** — ₹1,00,000 or ₹1,20,000? | Build the ₹1,20,000 superset | Before Phase 0 | Descoping later wastes work; see `00` §B5 |
| D-02 | **Buyer verification channel** — SMS OTP (₹150–200/mo) or free email magic-link? | SMS OTP, with the email path built as a config flag | Week 1 (DLT registration lead time) | Low — it is a flag |
| D-03 | **Is "Community" a restricted membership?** Must sellers belong to a specific association? | Open registration, admin-vetted | Phase 1 | High — membership verification is a new field, a new check and possibly a new document upload |
| D-04 | Does editing a **company name** require re-approval? | Yes | Phase 1 | Low |
| D-05 | Should **price/MOQ-only edits** skip re-review? | Yes (name/description/category edits re-review; price, MOQ and images do not) | Phase 2 | Low — driven by a `Setting` |
| D-06 | **Seller lead CSV export** — include? | Yes | Phase 4 | Low |
| D-07 | **Multiple admin accounts** at launch? | One admin; the schema supports many | Phase 1 | Medium if needed post-launch |
| D-08 | Cap on **contact reveals per buyer per day**? | 20 | Phase 4 | Low |
| D-09 | **Admin lead-notification cadence** — every lead, or hourly digest? | Immediate for sellers/products, hourly digest for leads | Phase 4 | Low |
| D-10 | **Domain name** and who owns the registrar account? | Client owns the registrar; vendor gets delegated access | Before Phase 0 | High — a domain in the vendor's name is a recurring source of disputes |
| D-11 | **Hosting budget gap** (`00` §D) — absorb, or re-quote at ~₹600/month? | Proceed with the Option 1 VPS; raise the gap in writing in week 0 | Before Phase 0 | High |
| D-12 | **Express deviation** (`02` §1.1) — acknowledged? | Proceed with Next.js; obtain written acknowledgement | Before Phase 0 | High — retrofitting a separate Express service costs ~3 days |
| D-13 | Who supplies **logo, brand assets and legal copy**? | Vendor uses placeholders; client supplies by Phase 5 | Phase 1 demo | Medium — a late brand change means a visual re-pass |
| D-14 | Initial **category taxonomy** — who defines it? | Vendor seeds a plausible list; client corrects it in Phase 6 | Phase 1 | Medium |
| D-15 | **"Post your requirement"** (PUB-08) in v1? | Yes if Phase 5 finishes early, otherwise Phase 2 of the product | Phase 4 | Low |
| D-16 | **Dark mode** shipped in v1? | Yes — tokens already exist, so the marginal cost is small | Phase 5 | Low |
| D-17 | **Analytics tool** — Plausible (paid, privacy-friendly) or GA4 (free)? | GA4 for cost, with the funnel events named in `01` §6 | Phase 4 | Low |
| D-18 | **Email sender domain** and DNS access for SPF/DKIM? | Client provides DNS access in week 1 | Phase 1 | High — without DKIM, approval emails land in spam and the whole seller funnel silently fails |

D-18 deserves emphasis: an unauthenticated sending domain means seller approval emails and lead
notifications go to spam. The product appears to work perfectly and produces no business result.
Get DNS access early and verify deliverability against Gmail, Outlook and at least one Indian ISP
before launch.

## B. Assumptions being made

Recorded so they can be contradicted cheaply now rather than expensively later.

1. English only. No Hindi or regional-language UI.
2. India only — INR display, Indian states, `+91` phone default.
3. Product volume in year one is thousands, not hundreds of thousands.
4. Sellers upload their own products; no bulk import and no data-entry service.
5. The admin approves within roughly a day; the product's value depends on it.
6. Buyers arrive by search and word of mouth. No paid acquisition is built in.
7. No integration with any existing client system (CRM, ERP, member database).
8. The client provides one admin who will actually use the panel daily.
9. Hosting, domain and email are in the client's own accounts, with vendor access delegated.

## C. Change request log

Anything not in `01-PRD.md` lands here first. Both quotations already carry the clause that new work
is estimated and charged separately; this table is how that clause gets applied without an argument.

| CR | Date | Request | Est. effort | Est. cost | Status | Decided by |
|---|---|---|---|---|---|---|
| — | — | *(none yet)* | — | — | — | — |

Process: log it → estimate within 2 working days → client approves in writing → schedule into a
phase or a post-launch release. **An unapproved CR is never built**, however small it sounds. "Just
one more field" is how a 7-week project becomes a 14-week one, and approval workflows attract these
requests more than any other kind of feature.

## D. Likely post-launch roadmap

Not in scope, but worth naming so v1 is not accidentally architected to exclude them:

**Phase 2 candidates** — bulk product import (CSV/Excel) · WhatsApp notifications via the Business
API · buyer requirement board with seller responses · seller analytics (views, lead sources,
conversion) · saved searches with email alerts · multiple product images per variant.

**Phase 3 candidates** — seller subscription tiers and promoted listings (the obvious revenue
model) · verified-seller badges tied to GST/document checks · in-platform chat · ratings and reviews
· a native app if PWA install rates disappoint · regional-language UI.

The schema in `03-DATA-MODEL.md` already accommodates most of these without migration pain, which is
deliberate — `Setting`, `AuditLog`, `LeadEvent` and the two-level category tree all exist partly to
keep those doors open.
