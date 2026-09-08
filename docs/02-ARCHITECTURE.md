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
| Jobs | **pg-boss** (PostgreSQL-backed queue) | Email retries, the 10-minute admin lead digest (D-09), the nightly validity sweep and renewal reminders — all without adding Redis. One less service to host. |
| Payments | **None — the application never touches money** (D-19 / Q-04) | Subscriptions are an admin-managed validity date. No gateway, no PCI scope, no reconciliation, no receipts. Plan tiers are CR-007 and Razorpay is CR-002, both deferred. |
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
separate Express service."* ⚠️ If you meant the latter, say so before Phase 0 (Q-02): the fallback is
Next.js for the web app plus a thin Express service mounting the same handlers — about three extra
days and roughly ₹400/month more hosting, for no user-visible benefit.

### 1.2 Next.js vs NestJS vs Express — clearing up the comparison

A question worth answering properly, because the terms get mixed up constantly.

**Node.js is not a competitor to any of these.** Node is the JavaScript *runtime* — the thing that
executes the code. Express, NestJS and Next.js are all **frameworks that run on top of Node.js**.
Asking "is Nest better than Node?" is like asking whether Django is better than Python: Django *is*
Python. All three options below are Node.js, so the D-12 instruction is satisfied by any of them.

The real question is which framework. Here is the honest comparison for *this* project:

| | **Express** | **NestJS** | **Next.js** *(chosen)* |
|---|---|---|---|
| What it is | Minimal HTTP router | Opinionated backend framework (Angular-style modules, decorators, dependency injection) | Full-stack React framework |
| Renders the UI? | No | No | **Yes — server-side** |
| Structure imposed | None | Very strong | Moderate |
| Built-in Swagger | No | **Yes**, from decorators | No — via `zod-to-openapi` |
| Dependency injection | No | **Yes** | No |
| Learning curve | Low | High | Moderate |
| Processes to deploy | 1 (+1 for the UI) | 1 (+1 for the UI) | **1 total** |
| SEO for public pages | Needs a separate SSR app | Needs a separate SSR app | **Native** |
| RAM footprint | Small | Medium | Medium |

**Where NestJS genuinely wins,** and it does win in the right context:

- Large teams. The enforced module/controller/service/DTO structure stops a big codebase drifting,
  because there is exactly one accepted way to add a feature.
- Large or public API surfaces. Decorator-driven Swagger, validation pipes, guards and interceptors
  are a genuinely better developer experience than assembling the same things by hand.
- Complex backends — microservices, gRPC, WebSockets, CQRS. Nest treats all of these as first-class.
- Heavy unit testing. Dependency injection makes mocking trivial.

**Why it is still the wrong choice here**, in order of weight:

1. **NestJS renders no UI.** It is backend-only. Choosing it means building *two* applications —
   Nest for the API and React or Next for the frontend — which means two deploys, two sets of logs,
   a CORS surface, and roughly double the hosting. That directly contradicts D-11, "hosting as low
   as possible."
2. **SEO is this product's growth engine.** A directory lives or dies on organic search for queries
   like "SS sheet supplier Rajkot". Server-rendered product pages are not a nice-to-have here; they
   are the acquisition strategy (`11-MARKETING-GTM.md` §5.1). Next.js does this natively. A Nest API
   with a client-rendered React frontend does not.
3. **The API is not the product.** Nest's strengths shine when many external clients consume your
   API. Here there is exactly one consumer — our own frontend — so the ceremony buys little.
4. **Team size is one to four AI agents on a 7.5-week build.** Nest's structure pays off over years
   and many developers; over seven weeks its boilerplate is a tax.

**We keep Nest's actual benefit without adopting Nest.** The thing worth copying is the discipline,
not the decorators — so §2.1 mandates `server/modules/<domain>/{service,repository,schema,policy}.ts`
and forbids business logic in route handlers. That gives the same predictable structure (which is
exactly what keeps AI-generated code coherent) with none of the second-process cost.

**Summary:** Express is too bare for a project of this size, NestJS is excellent but solves problems
this project does not have while creating one it cannot afford, and Next.js is the only option of the
three that serves the SEO-critical public site and the API from a single ₹600/month box. All three
are Node.js.

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
│     │  │  │  ├─ subscription/   # validity terms, expiry sweep, reminders
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
3. **No Redis, no Elasticsearch, no headless Chrome, no payment gateway.** pg-boss replaces the
   queue and Postgres full-text replaces the search engine; nothing in the app generates PDFs or
   processes money. Each avoided service is 200–500 MB of RAM and one more thing to monitor.

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
