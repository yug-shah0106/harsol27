# 11 — Marketing & Go-To-Market

Your three ideas are all good, and two of them are better than you've framed them. This document
keeps all three, sharpens each, and puts them in an order — because sequencing is what decides
whether a marketplace launch works, more than any individual tactic.

## 1. The one strategic decision that matters more than any tactic

**Go deep in one city and three categories. Do not launch broad.**

Every marketplace faces the same trap: buyers won't come without sellers, sellers won't stay without
buyers. There is only one reliable escape, and it is **density in a narrow slice**. A buyer searching
"MS angle" who finds eleven suppliers in their own city concludes the portal works. The same buyer
finding two suppliers, both 400 km away, concludes it doesn't — and does not come back. The second
outcome is what a broad launch produces, in every category at once.

So: pick the **one city** where the community is strongest and the **three product categories** with
the most existing sellers. Recruit 40–60 sellers into just those. Everything below is aimed at that
slice. Expand only when a category is producing leads consistently.

This matters more now that sellers pay (D-19). A subscription business cannot afford a first cohort
that gets no leads — those sellers won't renew, and in a tight community they will say so out loud.

**The number to hold yourself to before expanding: 3+ leads per active seller per month.** Below
that, adding a second city just spreads the thinness around.

## 2. Your idea 1 — Early-access forms ✅ *Strong. Make it a Founding Member programme.*

A plain "join the waitlist" form converts poorly because it asks for something and offers nothing.
Reframe it as a **Founding Member** offer with real, expiring value:

> **Founding Member — first 100 sellers**
> · Free for the first full year (worth ₹X)
> · Permanent "Founding Member" badge on your profile
> · Priority placement in your category for the first 6 months
> · Your categories set up for you — no paperwork
> · Closes when we hit 100, or on [date]

Why each piece is there: the free year removes all risk at the moment of highest doubt; the badge is
permanent status inside a community that knows each other, which is worth more here than in a generic
marketplace; priority placement is a real, scarce good; "set up for you" removes the actual barrier,
which is effort, not money.

The form itself should be short — **company name, contact person, phone, city, what you sell, and how
many products you'd list.** That's it. Do not ask for GST, address or a description; you can collect
those at onboarding. Every extra field costs signups, and the last field is the one that tells you
whether the seller is real.

Run a **parallel buyer form** — "tell us what you're looking for" — from day one. It converts far
worse, but each submission is a real requirement you can hand to your first sellers as a live lead
during onboarding. Nothing closes a seller faster than an inquiry in their hand.

**Engineering:** the seller form is a landing page plus a `Waitlist` table — half a day, in Phase 3.
The founding-member subscription needs no special code: it is a ₹0 `TRIALING` subscription with a
12-month term (SUB-10), so it expires and converts through exactly the same reminder machinery as any
paid plan.

⚠️ **The trap to avoid:** a waitlist you don't convert within two weeks is a dead list. Enthusiasm
decays fast. Plan the phone calls before you launch the form.

## 3. Your idea 2 — City groups ✅ *Right instinct. Wrong number of cities.*

WhatsApp is the correct channel — it's where this audience already is, and open rates crush email.
But **one group per city, launched simultaneously, will fail.** Ten cities means ten thin groups, and
a thin group is a dead group within three weeks.

**Do this instead:**

**Stage 1 — one group, one city.** Your launch city only. Mixed buyers and sellers. Aim for 80–150
members before you consider a second.

**Stage 2 — split by role once it's over ~150.** Sellers and buyers want different things; mixed
groups drift into noise and people mute them.

**Stage 3 — replicate to city two** only after city one is producing leads.

**Group rules, set on day one, pinned:**
- **Announcements-only for the first month.** Community admins post; members reply in DMs. Nothing
  kills a group faster than 40 "hi" messages in the first week.
- No direct selling in the group. Post your product on the portal; share the *portal link* here. This
  is the rule that drives portal usage instead of replacing it.
- One weekly digest post (see §4), one "new sellers this week" post, and real buyer requirements as
  they come in.
- Every requirement posted gets the portal link attached. Train the reflex: *the portal is where this
  happens.*

The single highest-value thing the group does is **route real requirements**. Community WhatsApp
groups already carry "does anyone supply X?" messages. Answer every one of them with a portal search
link. That does three jobs at once: it gives the buyer an answer, it gives a seller a lead, and it
teaches everyone what the portal is for.

## 4. Your idea 3 — Weekly update ✅ *Good. But you're reporting the wrong number.*

You said "numbers and sellers added." Sellers added is a **supply** metric, and it's the one thing
your audience doesn't care about. A seller reading "23 new sellers joined" hears *"23 new
competitors."*

**Lead with demand.** Restructure it:

> **This week on [Portal]**
> 🔎 **312 product searches** by buyers
> 📩 **47 buyer inquiries** sent to **23 sellers**
> 🏆 Most-searched: *MS Angle · SS Sheet · Ball Bearings*
> ❓ **9 searches found nothing** — we need suppliers for: *brass fittings, PVC pipes, industrial gloves*
> 🆕 14 new verified sellers · 156 new products
> 👉 [portal link]

Every line does a job. Inquiry count is social proof of demand and the reason to renew. Most-searched
tells sellers what to list. **The "found nothing" line is the most valuable thing in the whole
email** — it is a free, precise recruitment list, it tells existing sellers what to add, and it makes
the community feel like a live thing that needs their participation.

Send **Monday morning**, on WhatsApp *and* email. Keep it under 150 words.

**This is also your renewal engine.** With a free founding year, the first invoice lands at month 12.
By then you need every seller to have absorbed "the portal sends me business" — 50 weekly reminders
of exactly that does more for renewal than any sales call in month 11.

**Engineering:** the numbers all exist in the admin dashboard. An admin-triggered "generate weekly
digest" that outputs a copy-pasteable block is roughly half a day and worth it — a manual stats hunt
every Monday gets skipped by week five.

## 5. Three additions worth more than any of the above over time

### 5.1 Programmatic SEO — the compounding asset *(CR-003, 2–3 days — highest ROI in this list)*

Auto-generate an indexable landing page for every **city × category** pair that has sellers:
`/suppliers/rajkot/ss-sheet` → "SS Sheet Suppliers in Rajkot — 14 verified sellers".

This is exactly what buyers type into Google, and it is why the architecture uses server-rendered
pages (`02-ARCHITECTURE.md` §1). Thirty categories × ten cities is 300 pages that generate free,
compounding, high-intent traffic forever, built once. Every other channel here stops the day you stop
working it; this one doesn't.

Guard rail: only generate a page when it has **at least 3 sellers**. Thin pages hurt rankings and
disappoint buyers.

### 5.2 Seed the demand side manually — weeks 1–4

Do not wait for organic buyers. The community office already knows who's buying what. For the first
month, take those requirements and route them through the portal as real inquiries, so your founding
sellers get leads in week one rather than week eight.

This feels like cheating. It isn't — it's how essentially every successful marketplace started, and
it is the only thing that prevents the "I signed up and nothing happened" churn that kills a first
cohort.

### 5.3 Seller referrals *(CR-004, 1.5 days)*

"Refer a seller who gets approved — both of you get 2 months added." In a community where everyone
knows everyone, referral is the cheapest acquisition channel that exists, and the subscription
already gives you a currency to pay in that costs nothing.

## 6. Launch sequence, mapped to the build

| When | Build phase | Marketing |
|---|---|---|
| Weeks 1–3 | Phases 0–2 | Pick the city + 3 categories. Draft founding-member terms. Build the recruitment list — target 150 names for 100 slots. |
| Week 4 | Phase 2b–3 | **Early-access form live.** Announce in existing community channels. Start the WhatsApp group (announcements only). |
| Weeks 5–6 | Phases 3–4 | Call every signup. Onboard sellers **for** them — you upload their first 5 products. This one act, more than anything else, determines whether they ever come back. |
| Week 7 | Phase 5 | Soft launch to the WhatsApp group only. Seed real requirements. First weekly digest. |
| Week 8–9 | Phase 6 + launch | Public launch. Offline community meeting/demo if possible — the community angle makes in-person work here in a way it wouldn't for a generic portal. Submit to Search Console. |
| Months 2–3 | Post-launch | Weekly digests without fail. Recruit against the "found nothing" list. Only now consider city two. |
| Month 10 | | Renewal campaign, armed with each seller's personal lead count. |

## 7. What to measure

| Channel | Metric | Healthy |
|---|---|---|
| Early-access form | Visit → signup | 15–25% |
| | Signup → approved seller | > 60% (below this, your calls are too slow) |
| WhatsApp group | Members / weekly link clicks | 100+ / 10%+ of members |
| Weekly digest | Open rate (email) | > 40% — it's opt-in and relevant, so a normal 20% means it's boring |
| SEO pages | Organic sessions / month | Near zero for 8 weeks, then compounding — do not judge it early |
| Referrals | Share of new sellers | > 20% by month 3 |
| **Overall** | **Leads per active seller per month** | **≥ 3 — the only number that predicts renewal** |

Track all of it in GA4 (D-17) with the funnel events in `01-PRD.md` §6.

## 8. Positioning

**For sellers:** *"Your products, in front of the buyers who already trust this community. Not a
directory — a lead machine."* Sell the leads, not the listing.

**For buyers:** *"Find verified suppliers from your own community. Search, call, done. No middleman,
no commission."* Sell trust and speed, not selection.

**The community is the moat.** Anyone can build a marketplace; nobody else can credibly claim these
sellers are vetted by *this* community. Put the vetting front and centre — the Community Verified
badge (ADM-11) is a marketing asset, not just a data field.

## 9. Four things not to do

1. **Don't launch in ten cities at once.** Density beats coverage; §1 is the whole argument.
2. **Don't buy ads before leads-per-seller clears 3.** Paid traffic into a thin marketplace converts
   badly and teaches buyers the portal is empty. Fix supply density first.
3. **Don't let the WhatsApp group become a classifieds board.** Enforce the no-direct-selling rule
   from day one; it's unenforceable once the habit forms.
4. **Don't skip a weekly digest.** Miss two and it's over — the discipline *is* the product as far as
   an inactive seller is concerned.

## 10. Marketing work that needs engineering

| Item | Effort | When | Status |
|---|---|---|---|
| Early-access / founding-member landing + `Waitlist` table | 0.5 day | Phase 3 | In scope |
| Founding-member subscription | — | Phase 2b | Already SUB-10 |
| Community Verified badge | — | Phase 1 | Already ADM-11 |
| Weekly digest generator (admin-triggered) | 0.5 day | Phase 4 | **Recommend adding** |
| "Zero-result searches" log + admin view | 0.5 day | Phase 3 | **Recommend adding** — feeds §4 and §5.1 |
| Programmatic city × category SEO pages | 2–3 days | Post-launch | CR-003 |
| Referral tracking with subscription credit | 1.5 days | Post-launch | CR-004 |

The two "recommend adding" items total one day and directly power the weekly update you already
planned to send. They're the best-value engineering on this page.
