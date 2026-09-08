# Community B2B Marketplace Portal — Plan Set

Everything needed to build this product end-to-end with AI agents. Read in order.

| # | Document | What it answers |
|---|---|---|
| 00 | [00-SCOPE-RECONCILIATION.md](./00-SCOPE-RECONCILIATION.md) | The two quotations disagree. This is the single agreed scope, plus the commercial/hosting reality check. |
| 01 | [01-PRD.md](./01-PRD.md) | What we are building, for whom, with numbered requirements and acceptance criteria. |
| 02 | [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) | Stack decision, repo layout, environments, third-party services. |
| 03 | [03-DATA-MODEL.md](./03-DATA-MODEL.md) | Prisma schema, enums, indexes, state machines. |
| 04 | [04-API-SPEC.md](./04-API-SPEC.md) | Every endpoint, auth rules, payloads, error contract. |
| 05 | [05-DESIGN-SYSTEM.md](./05-DESIGN-SYSTEM.md) | Colour codes, theme, typography, spacing, components. All contrast values verified. |
| 06 | [06-PWA-SPEC.md](./06-PWA-SPEC.md) | Install, offline, caching, push, iOS/Android specifics. |
| 07 | [07-ROADMAP.md](./07-ROADMAP.md) | Phase-by-phase build plan with exit gates. |
| 08 | [08-AI-BUILD-PLAYBOOK.md](./08-AI-BUILD-PLAYBOOK.md) | How the AI actually builds it: guardrails, agent split, prompt templates, definition of done. |
| 09 | [09-QA-SECURITY-LAUNCH.md](./09-QA-SECURITY-LAUNCH.md) | Test strategy, security checklist, launch and handover runbook. |
| 10 | [10-OPEN-DECISIONS.md](./10-OPEN-DECISIONS.md) | Decisions resolved on 2026-09-08, questions still open, and the change log. |
| 11 | [11-MARKETING-GTM.md](./11-MARKETING-GTM.md) | Launch strategy: founding members, city groups, weekly digest, SEO. |

> **Updated 2026-09-08.** Client decisions are recorded in `10-OPEN-DECISIONS.md` §A. Two of them
> reshape the project: **₹1,00,000 is the signed fee**, and **annual seller subscriptions are now in
> scope**. Read `10-OPEN-DECISIONS.md` §C before committing to a date.

## The 60-second version

A lead-generation B2B marketplace. Sellers apply, an admin approves them and assigns them
categories. Sellers list products only inside their assigned categories; the admin approves each
product. Buyers search the public catalogue, and a seller's phone/email stays hidden until the
buyer submits a verified inquiry — that submission *is* the lead. Everyone gets notified. No
payments, no cart, no pricing enforcement, ever.

Sellers pay an **annual subscription** — plans gate listing capacity and prominence, never lead
access. Payments are recorded manually by an admin in v1; no gateway.

Delivered as one responsive web app that installs as a PWA on Android and iOS.

## Ground rules baked into every document

1. **Design tokens before pixels.** No component is written until `05-DESIGN-SYSTEM.md` tokens
   exist in code. AI agents must never hardcode a hex value.
2. **Schema before endpoints.** `03-DATA-MODEL.md` is the single source of truth; types are
   generated from it, never hand-written.
3. **Vertical slices.** A feature ships as migration + API + UI + test together, not layer by layer.
4. **`pnpm verify` is the gate.** Typecheck, lint, unit, E2E. An agent that cannot make it pass has
   not finished the task.
