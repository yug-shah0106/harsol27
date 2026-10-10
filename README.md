# Community B2B Marketplace Portal

A curated, admin-vetted B2B marketplace for a trade community. Approved sellers list products,
buyers search and submit verified inquiries, and each inquiry becomes a lead that unlocks the
seller's contact details. Sellers pay an annual subscription off-platform — the portal tracks only a
validity date. No cart, no orders, no payment handling; the platform's only job is to turn a search
into a phone call.

Delivered as a single responsive web application, installable as a PWA on Android and iOS.

## Status

**Phases 1–8 built:** foundation (schema, staff sign-in with Admin/Viewer roles, Docker, CI), public
pages (design system, home, About/Terms/Privacy, lead form with emails, leads and industries admin),
accounts and sellers (phone sign-in, seller application with documents, admin approval with
history), the marketplace (products with photos, search, browse by industry, inquiries that
unlock seller contacts, seller and admin dashboards), subscriptions (staff record yearly payments
and paid-until dates; reminder emails to sellers; a weekly renewal list to the team), and the 3D home page (Uttarayan kites, with a static fallback)
plus an installable app with an offline page; Phase 7 added the security review, access and
accessibility checks for every role, and performance budgets ([docs/12-SECURITY-REVIEW.md](./docs/12-SECURITY-REVIEW.md)); Phase 8
added backups, monitoring and one-command deploys ([deploy/README.md](./deploy/README.md)) and the
go-live checklist ([docs/13-GO-LIVE-CHECKLIST.md](./docs/13-GO-LIVE-CHECKLIST.md)). Deferred work is tracked in [docs/FUTURE.md](./docs/FUTURE.md). The brief of 2026-10-07 supersedes `docs/`
where they disagree; `docs/` is kept for history.

## Local development

Requires Node 24, pnpm (via `corepack enable`) and Docker (for the local database and file storage).

```bash
cp .env.example .env          # fill in; create two databases: dev and test
pnpm install
pnpm dev:services             # local PostgreSQL 18 and S3-compatible storage (stands in for R2)
pnpm storage:setup            # create the dev bucket and its CORS rule
pnpm db:migrate               # apply migrations to the dev database
pnpm db:seed                  # starting list of industries
pnpm staff create --email you@example.com --name "You" --role ADMIN
pnpm dev                      # http://localhost:3000
pnpm worker                   # in a second terminal: emails, photo processing, scheduled jobs
```

Buyers and sellers create an account at `/sign-up` (email, mobile, password); staff sign in at `/staff/sign-in`. Password-reset emails are sent by `pnpm worker`. "Continue with Google" appears once `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set (see `.env.example`). Sign-in by SMS code is switched off.

Checks (the same ones CI runs):

```bash
pnpm verify                   # lint, typecheck, unit tests, build
pnpm test:e2e                 # Playwright, against the production build and the test database
```

Staging and deployment: [deploy/README.md](./deploy/README.md).

## Plan documents (written before the 2026-10-07 brief)

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
| Decisions & change log | [docs/10-OPEN-DECISIONS.md](./docs/10-OPEN-DECISIONS.md) |
| Marketing & go-to-market | [docs/11-MARKETING-GTM.md](./docs/11-MARKETING-GTM.md) |
| Security, testing & performance review | [docs/12-SECURITY-REVIEW.md](./docs/12-SECURITY-REVIEW.md) |
| Go-live checklist | [docs/13-GO-LIVE-CHECKLIST.md](./docs/13-GO-LIVE-CHECKLIST.md) |
| Running the server (deploy, backups, monitoring) | [deploy/README.md](./deploy/README.md) |
| Things to address later | [docs/FUTURE.md](./docs/FUTURE.md) |

## Stack

Next.js 16 (App Router, TypeScript strict) · PostgreSQL + Prisma 7 · Tailwind v4 + shadcn/ui ·
Better Auth (staff email + password; buyer/seller phone OTP) · Cloudflare R2 · Resend · SMS provider to be chosen ·
pg-boss · Serwist (PWA) · Playwright + Vitest · Docker Compose.

## Verify the design tokens

```bash
node docs/assets/check-contrast.mjs
```

Checks every colour pairing in the design system against WCAG 2.1, and asserts that the three
documented unsafe pairings are still unsafe.
