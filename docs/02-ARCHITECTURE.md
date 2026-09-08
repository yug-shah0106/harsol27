# 02 — Architecture

## 1. Stack decision

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript strict** | Server components give the SEO-critical public pages real server rendering, which a plain React SPA cannot. One codebase, one deploy, one process — decisive at this hosting budget. |
| API | **Next.js Route Handlers under `/api/v1/*`**, documented with OpenAPI | A real versioned REST surface, but with zero second process to host and monitor. A future native app consumes the same routes. |
| DB | **PostgreSQL 16** | As quoted. Full-text search and `pg_trgm` remove any need for a separate search service. |
| ORM | **Prisma** | The schema file is the single source of truth AI agents read from; type generation eliminates a whole class of AI drift. |
| Validation | **zod**, shared client/server | One schema per input, imported by both the form and the handler. No duplicated rules. |
| Auth | **Auth.js v5 (credentials)**, httpOnly cookie sessions, JWT-backed | Cookies for web (safe from XSS token theft); the same JWT works as a bearer token for future mobile. |
| UI | **Tailwind CSS v4 + shadcn/ui (Radix primitives)** | Radix gives keyboard/ARIA behaviour for free, which is most of WCAG AA. shadcn components are copied into the repo, so agents can restyle them to our tokens rather than fight a library theme. |
| Forms | **react-hook-form + zodResolver** | |
| State | Server components + URL state; **TanStack Query** only in dashboards | Filters belong in the URL (PUB-02). Avoid a global store; it is where AI-written code goes to rot. |
| Images | **Cloudflare R2** + `next/image` | Zero egress fees. Sharp re-encodes to WebP on upload. |
| Email | **Resend** (or Brevo) with **React Email** templates | Free tier covers launch volume. Templates as components stay in the repo and in review. |
| SMS/OTP | **MSG91** (India DLT-registered) | ⚠️ Requires DLT template registration — start this in week 1, it takes 3–7 working days. |
| Jobs | **pg-boss** (PostgreSQL-backed queue) | Email retries, the 10-minute admin lead digest (D-09), nightly subscription expiry sweep and renewal reminders — all without adding Redis. One less service to host. |
| PDF receipts | **@react-pdf/renderer** | Subscription receipts (SUB-08) rendered from a React component in-process. No headless Chrome, which would not fit in 2 GB. |
| Payments | **None in v1** — admin records payments manually (D-19 / Q-05) | Razorpay self-serve is CR-002. Keeping money out of the app for v1 removes PCI scope, webhook reconciliation and refund handling from a 7-week build. |
| Push | **Web Push (VAPID)** via `web-push` | Free, no FCM project needed. |
| Errors | **Sentry** free tier | |
| Tests | **Vitest** + **Playwright** + **axe-core** | |
| CI/CD | **GitHub Actions** → build image → deploy over SSH | |
| Host | Single VPS, **Docker Compose** (app + Postgres + Caddy), **Cloudflare** in front | See `00-SCOPE-RECONCILIATION.md` §D. |

### 1.1 Runtime — resolved (D-12)

Client instruction: **"stick with Node.js."** Confirmed — Next.js 15 runs on **Node 22**, and it uses
a Connect/Express-compatible middleware model underneath. One Node process serves both the rendered
app and the REST API at `/api/v1`, with JWT auth and Swagger docs, exactly as Quotation B promised.

We are reading that instruction as *"the backend must be Node.js"* rather than *"there must be a
separate Express service."* The distinction matters: a second Express process means two deploys, two
sets of logs and a CORS surface on a box we are explicitly trying to keep as cheap as possible, and
it forces the public product pages to be client-rendered — which measurably hurts Google indexing
for a directory whose entire growth model is organic search.

⚠️ **If you specifically meant Node + Express as two services, say so before Phase 0** (Q-02). The
fallback is Next.js for the web app plus a thin Express service mounting the same handlers: about
three extra days and roughly ₹400/month more hosting, for no user-visible benefit.

## 2. Repository layout

Monorepo, pnpm workspaces. Flat enough that an AI agent always knows where a file goes.

```
/
├─ apps/
│  └─ web/                        # the Next.js application (the only deployable)
│     ├─ src/
│     │  ├─ app/
│     │  │  ├─ (public)/          # marketing + catalogue, no auth
│     │  │  │  ├─ page.tsx                       # home
│     │  │  │  ├─ products/page.tsx              # listing + filters
│     │  │  │  ├─ products/[slug]/page.tsx       # detail
│     │  │  │  ├─ sellers/[slug]/page.tsx
│     │  │  │  ├─ categories/[slug]/page.tsx
│     │  │  │  └─ (cms)/[page]/page.tsx
│     │  │  ├─ (auth)/            # login, register, forgot, reset
│     │  │  ├─ (seller)/seller/   # seller dashboard, guarded by middleware
│     │  │  ├─ (admin)/admin/     # admin panel, guarded by middleware
│     │  │  ├─ (buyer)/account/   # my inquiries
│     │  │  └─ api/v1/…           # route handlers, mirrors 04-API-SPEC.md
│     │  ├─ components/
│     │  │  ├─ ui/                # shadcn primitives, tokens only
│     │  │  ├─ marketplace/       # ProductCard, FilterBar, ImageGallery, ContactGate…
│     │  │  ├─ dashboard/         # StatTile, DataTable, StatusBadge…
│     │  │  └─ layout/            # Header, Footer, MobileTabBar, AdminShell
│     │  ├─ server/               # ALL business logic lives here
│     │  │  ├─ modules/           # one folder per domain
│     │  │  │  ├─ seller/         # service.ts · repository.ts · schema.ts · policy.ts
│     │  │  │  ├─ product/
│     │  │  │  ├─ category/
│     │  │  │  ├─ lead/
│     │  │  │  ├─ subscription/   # plans, terms, expiry, reminders, receipts
│     │  │  │  ├─ adminuser/      # admin invites & roles (D-07)
│     │  │  │  ├─ notification/
│     │  │  │  ├─ cms/
│     │  │  │  └─ audit/
│     │  │  ├─ auth/
│     │  │  ├─ db.ts              # Prisma singleton
│     │  │  ├─ jobs/              # pg-boss workers
│     │  │  └─ lib/               # storage, mailer, sms, ratelimit, slug, image
│     │  ├─ emails/               # React Email templates
│     │  └─ styles/tokens.css     # generated from packages/tokens — never edited by hand
│     ├─ prisma/schema.prisma
│     ├─ public/                  # manifest, icons, robots
│     └─ tests/  (unit/ · e2e/ · fixtures/)
├─ packages/
│  ├─ tokens/                     # design tokens: source of truth → CSS vars + TW theme
│  └─ config/                     # eslint, tsconfig, prettier presets
├─ docs/                          # this plan set — kept current, it is the agent brief
├─ infra/                         # docker-compose.yml, Caddyfile, deploy.sh, backup.sh
└─ .github/workflows/
```

### 2.1 The rule that keeps AI-written code coherent

**Route handlers and server components must not contain business logic.** They parse input with a
zod schema, call one service function, and shape the response. All decisions — who may do what,
what state may follow what — live in `server/modules/<domain>/service.ts` and `policy.ts`.

This single rule is worth more than any style guide when generating code with AI: it means
authorisation is testable in isolation, it cannot be forgotten in one of thirty handlers, and a new
agent picking up a task has exactly one place to look.

## 3. Request flow

```
Browser / installed PWA
   │
Cloudflare  ── CDN, TLS, WAF, bot rules, cache for static + public GETs
   │
Caddy (VPS) ── automatic TLS, gzip/brotli, reverse proxy
   │
Next.js (Node 22, Docker)
   ├─ Server Components ─→ service layer ─→ Prisma ─→ PostgreSQL
   ├─ Route Handlers ────→ zod ─→ policy ─→ service ─→ Prisma
   └─ pg-boss workers ───→ email / push / digest / sitemap regen
                            │
                            ├─ Resend (email)
                            ├─ MSG91 (SMS OTP)
                            └─ R2 (images, served via Cloudflare)
```

## 4. Environments

| Env | Where | Data | Purpose |
|---|---|---|---|
| Local | Docker Compose | Seeded fixtures | Development, agent verification |
| Preview | One per PR (Vercel preview or a `docker compose -f preview` stack) | Seeded fixtures | Client review of a feature before merge |
| Production | VPS | Real | Live |

There is no separate staging box at this budget. Preview environments plus a rehearsed rollback
cover the same risk for a fraction of the cost.

## 5. Configuration

All config through environment variables, validated at boot by a zod schema in
`src/server/env.ts` — **the app refuses to start if a variable is missing or malformed.** This
converts the most common production incident (a forgotten env var) into a loud failure at deploy
time rather than a silent 500 at 2 a.m.

```
DATABASE_URL, AUTH_SECRET, AUTH_URL
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
RESEND_API_KEY, EMAIL_FROM, ADMIN_NOTIFY_EMAIL
MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, MSG91_SENDER_ID
VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
SENTRY_DSN, NEXT_PUBLIC_SITE_URL, NODE_ENV
OTP_PROVIDER=msg91|email|console      # console short-circuits OTP in dev and E2E
```

## 6. Deployment & rollback

Build a versioned image in CI, push to GHCR, deploy by SSH: pull, `prisma migrate deploy`, start the
new container, health-check `/api/health`, swap, stop the old one. Keep the previous image tag on
the box so rollback is one command.

Migrations must be **backward compatible with the previous release** (expand-then-contract: add
column → deploy code that writes both → backfill → drop old column in a later release). Without
this rule, rollback is impossible the moment a migration drops anything.

## 7. Backups

`pg_dump` nightly at 02:30 IST → gzip → upload to R2 with a 30-day lifecycle rule → weekly copy
retained 6 months. Product images live in R2, which is already replicated, but a weekly bucket
inventory is written alongside the dump so a restore can detect missing objects.

**A restore rehearsal is a Phase 6 exit gate** (`09-QA-SECURITY-LAUNCH.md` §5), and the measured
restore time goes in the handover runbook.

## 8. Minimum-cost production stack (D-11)

Instruction: keep hosting as low as possible. Every line below is either free or the cheapest option
that will genuinely run this workload.

| Component | Choice | Monthly |
|---|---|---|
| App + PostgreSQL + Caddy + worker | **One 2 GB / 2 vCPU VPS**, Indian or Singapore region, Docker Compose | ₹450–1,000 |
| CDN, TLS, WAF, bot rules, DDoS | **Cloudflare free** | ₹0 |
| Product images | **Cloudflare R2** — 10 GB free, zero egress | ₹0 to ~30k images |
| Transactional email | **Brevo** (300/day) or **Resend** (3k/month) free tier | ₹0 |
| SMS OTP | MSG91, per message | ₹150–200 at 1k inquiries/month |
| Errors | **Sentry** free | ₹0 |
| Uptime | **UptimeRobot** free | ₹0 |
| CI/CD, image registry | **GitHub Actions + GHCR** free | ₹0 |
| Backups | `pg_dump` → R2 (inside the free 10 GB) | ₹0 |
| **Total** | | **≈ ₹600–1,200/month** |

Verify current VPS pricing at purchase time; the ₹450–1,000 band reflects the small-VPS market
generally rather than one provider's promotional rate. Prefer a provider with an Indian or
Singapore region — Cloudflare absorbs most of the latency for cached public pages, but the seller
and admin dashboards are uncached and their responsiveness tracks origin latency directly.

**Three techniques that make 2 GB comfortable rather than marginal:**

1. **Build in CI, never on the server.** GitHub Actions builds and pushes the Docker image; the VPS
   only pulls and runs it. A Next.js production build is by far the most memory-hungry thing this
   project does — keeping it off the box is what allows the small tier.
2. **Cache the public catalogue at Cloudflare.** The read-heavy pages carrying nearly all the traffic
   are served from the edge; the origin sees very little.
3. **No Redis, no Elasticsearch, no headless Chrome.** pg-boss replaces the queue, Postgres
   full-text replaces the search engine, and React-PDF replaces Chrome for receipts. Each avoided
   service is 200–500 MB of RAM and one more thing to monitor.

**Tune Postgres for a small box.** The defaults assume a dedicated server: set `shared_buffers` to
~256 MB, `effective_cache_size` ~768 MB, `work_mem` ~8 MB, `max_connections` 40, and put Prisma
behind a connection pool. Untuned Postgres on a 2 GB box is the most common cause of "the site got
slow after launch".

**The honest limitation.** One box is one point of failure: a hardware failure means downtime until
a restore completes. Mitigations are nightly off-box backups, an image that redeploys in minutes, and
a rehearsed restore with a measured time. At this budget that is the right trade, but it must be
stated in the handover rather than discovered.

## 9. Scale headroom

The quotation targets 500–1,000 users/month. This architecture handles roughly 100× that on a single
₹600/month box, because the read-heavy public catalogue is cacheable at Cloudflare and every write
path is a simple indexed insert. The first thing to break at real scale would be full-text search
around a few hundred thousand products — at which point a managed Postgres with more RAM, or
Typesense, is a contained swap behind the `product` module's repository, not a rewrite.
