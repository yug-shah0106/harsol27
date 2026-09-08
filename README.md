# Community B2B Marketplace Portal

A curated, admin-vetted B2B marketplace for a trade community. Approved sellers list products,
buyers search and submit verified inquiries, and each inquiry becomes a lead that unlocks the
seller's contact details. No payments, no orders — the platform's only job is to turn a search into
a phone call.

Delivered as a single responsive web application, installable as a PWA on Android and iOS.

## Status

**Planning complete. No application code yet.** The full plan set lives in [`docs/`](./docs/) and is
the brief that AI agents build from.

Start here → **[docs/README.md](./docs/README.md)**

| | |
|---|---|
| Scope & commercial reality check | [docs/00-SCOPE-RECONCILIATION.md](./docs/00-SCOPE-RECONCILIATION.md) |
| Product requirements | [docs/01-PRD.md](./docs/01-PRD.md) |
| Architecture | [docs/02-ARCHITECTURE.md](./docs/02-ARCHITECTURE.md) |
| Data model | [docs/03-DATA-MODEL.md](./docs/03-DATA-MODEL.md) |
| API specification | [docs/04-API-SPEC.md](./docs/04-API-SPEC.md) |
| Design system & colour | [docs/05-DESIGN-SYSTEM.md](./docs/05-DESIGN-SYSTEM.md) |
| PWA specification | [docs/06-PWA-SPEC.md](./docs/06-PWA-SPEC.md) |
| Phase-wise roadmap | [docs/07-ROADMAP.md](./docs/07-ROADMAP.md) |
| AI build playbook | [docs/08-AI-BUILD-PLAYBOOK.md](./docs/08-AI-BUILD-PLAYBOOK.md) |
| QA, security & launch | [docs/09-QA-SECURITY-LAUNCH.md](./docs/09-QA-SECURITY-LAUNCH.md) |
| Open decisions & change log | [docs/10-OPEN-DECISIONS.md](./docs/10-OPEN-DECISIONS.md) |

## Stack

Next.js 15 (App Router, TypeScript strict) · PostgreSQL 16 + Prisma · Tailwind v4 + shadcn/ui ·
Auth.js · Cloudflare R2 · Resend · MSG91 · pg-boss · Serwist (PWA) · Playwright + Vitest ·
Docker Compose on a single VPS behind Cloudflare.

Rationale, and the one documented deviation from the quoted stack, are in
[docs/02-ARCHITECTURE.md](./docs/02-ARCHITECTURE.md) §1.

## Verify the design tokens

```bash
node docs/assets/check-contrast.mjs
```

Checks every colour pairing in the design system against WCAG 2.1, and asserts that the three
documented unsafe pairings are still unsafe.

## Timeline

7 phases over 7 calendar weeks, roughly 5 weeks of engineering plus buffer for client review.
See [docs/07-ROADMAP.md](./docs/07-ROADMAP.md).

## Before building anything

Six decisions in [docs/10-OPEN-DECISIONS.md](./docs/10-OPEN-DECISIONS.md) need client input before
Phase 0: **D-01** (which quotation is signed), **D-10** (domain ownership), **D-11** (the hosting
budget gap), **D-12** (the Express deviation), **D-18** (DNS access for email authentication), and
**D-02** (SMS OTP — the DLT registration has a 3–7 working day lead time and must start in week 1).
Each has a default so work can begin regardless.
