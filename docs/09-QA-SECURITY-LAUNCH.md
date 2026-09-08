# 09 — QA, Security & Launch

## 1. Test strategy

A deliberately thin pyramid. In an AI-built codebase the highest-value tests are the ones that
encode **rules an agent could plausibly get wrong** — authorisation, state transitions, data
exposure — not the ones that re-assert that React renders.

| Layer | Tool | Coverage target | What it covers |
|---|---|---|---|
| Unit | Vitest | 80% of `src/server/modules` | Services, policies, state machines, validators, utilities |
| Integration | Vitest + a real Postgres (testcontainer or the compose DB) | All API routes | Auth, validation, error contract, DB effects |
| E2E | Playwright | The 3 CUJs + 12 secondary flows | Real browser, real DB, seeded fixtures |
| Accessibility | `@axe-core/playwright` | Every page | Zero violations, asserted in CI |
| Performance | Lighthouse CI | Home, listing, detail, seller dashboard | Budgets from `01-PRD.md` SYS-03 |
| Visual | Playwright screenshots on 6 key screens | — | Catches unintended UI drift between agent sessions |

### 1.1 Tests that are mandatory, by name

These are the ones worth writing first, because each guards a rule that is invisible at the call
site:

1. `contact-masking.spec.ts` — iterate **every** public API route and every fixture; assert no
   response body contains a seller phone or email substring. This is the highest-value test in the
   suite: a leak here destroys the product's core value proposition and it is exactly the kind of
   thing a new endpoint written in week 5 reintroduces.
2. `policy/product.spec.ts` — a seller cannot create or move a product into an unassigned category,
   including by calling the API directly.
3. `policy/ownership.spec.ts` — seller A cannot read or mutate seller B's products, leads or profile.
4. `state-machine.spec.ts` — table-driven over every (state, transition) pair for seller, product
   and lead; every illegal pair returns 409.
5. `auth-escalation.spec.ts` — buyer→seller routes, seller→admin routes, unauthenticated→everything.
   All 401/403/404.
6. `cache-headers.spec.ts` — every authenticated route responds `private, no-store`.
7. `lead-flow.spec.ts` — the full inquiry→OTP→reveal path, plus expiry, attempt exhaustion, resend
   cooldown, and dedupe.
8. `visibility.spec.ts` — pending, rejected and deactivated sellers and their products are absent
   from every public surface.

### 1.2 Browser & device matrix

| | Priority | Notes |
|---|---|---|
| Chrome Android (mid-range, 4G throttled) | **P0** | The primary device. Test on a real one, not just DevTools emulation. |
| Safari iOS 16.4+ | **P0** | PWA install + push behaviour differs materially |
| Chrome desktop | P0 | Admin panel's home |
| Safari macOS | P1 | |
| Firefox, Edge | P1 | |
| Samsung Internet | P2 | Non-trivial share of the Indian Android market |

Minimum viewport 360×640. Test with a slow 4G profile and 4× CPU throttling — the target user's
phone is not a MacBook.

## 2. Regression checklist (Phase 6)

**Public** — home renders and every link works · search returns relevant results · filters compose
and survive refresh · pagination boundaries (page 1, last page, page beyond last) · product detail
with and without price/MOQ · gallery on touch and keyboard · seller profile · related products ·
CMS pages · contact form incl. honeypot · 404 and 500 pages · sitemap and robots · OG preview.

**Auth** — register, login, logout · wrong password gives a generic error · forgot/reset happy path,
expired token, reused token · session expiry · concurrent sessions · no account enumeration anywhere.

**Seller** — pending/rejected/deactivated status screens · profile edit incl. logo · product create
with 1 image and with 8 · edit approved product (re-review) vs price-only edit (no re-review) ·
delete with existing leads · unassigned-category rejection · zero-categories empty state · lead
inbox, filters, status changes, CSV export · notification bell.

**Admin** — dashboard counts reconcile against SQL · seller approve/reject/activate/deactivate ·
category CRUD, delete-with-products blocked, reorder · category assignment incl. the
affected-products warning · moderation queue and bulk approve · lead filters and export · CMS edit
with XSS payload attempted · audit log entries present for every action above.

**Cross-cutting** — both themes · all breakpoints · offline · install on both platforms · push on
both platforms · every email renders correctly in Gmail app, Gmail web and Outlook · error states
with the network disabled · double-submit on every form · browser back through multi-step flows.

## 3. Security checklist

Mapped to OWASP Top 10, with the items that actually apply here.

**A01 Broken access control** — every route asserts role *and* ownership in `policy.ts`, never in a
`where` clause alone · IDs are cuid, not sequential · non-public entities return 404 not 403 · the
escalation suite (§1.1 #5) runs in CI · admin routes guarded in middleware *and* in the handler
(defence in depth — middleware config is easy to get subtly wrong).

**A02 Cryptographic failures** — argon2id (or bcrypt cost ≥12) for passwords · OTP codes stored
hashed · reset tokens hashed, single-use, 30-minute expiry · HTTPS enforced with HSTS · secrets in
env only, never committed · `AUTH_SECRET` ≥ 32 random bytes.

**A03 Injection** — Prisma parameterises everything; the only raw SQL is the full-text query and it
uses bound parameters · CMS HTML sanitised **server-side** with an allowlist before storage (not on
render — sanitise once, at the boundary) · no `dangerouslySetInnerHTML` outside the sanitised CMS
renderer · CSV export escapes leading `=`, `+`, `-`, `@` to prevent formula injection when a seller
opens their leads in Excel.

**A04 Insecure design** — the contact-masking rule is enforced by a single serialiser with a test
over all fixtures · OTP rate-limited per phone *and* per IP · lead dedupe prevents notification
flooding · file uploads never trust the declared content type.

**A05 Misconfiguration** — security headers via Caddy and Next config: `Content-Security-Policy`
(no `unsafe-inline` scripts; use nonces), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera/mic/geo ·
stack traces never returned to clients · Postgres bound to the Docker network only, never the public
interface · default admin credentials changed at deploy and the change verified.

**A07 Authentication failures** — login rate-limited 10/15 min per IP + per account · password
minimum 10 chars checked against a common-password list · session cookie httpOnly + Secure +
SameSite=Lax · session invalidated on password change · CSRF tokens on all state-changing form posts.

**A08 Integrity failures** — dependencies pinned; `pnpm audit` in CI; Dependabot weekly · SRI on any
third-party script (there should be none).

**A09 Logging** — every admin mutation writes an `AuditLog` row in the same transaction · auth
failures and rate-limit hits logged · Sentry for exceptions · **never log**: passwords, OTP codes,
reset tokens, session cookies, full phone numbers (log the last 4 only).

**A10 SSRF** — no user-supplied URL is ever fetched server-side. If seller `websiteUrl` is ever
rendered, it is `rel="nofollow noopener"` and never fetched.

**Application-specific**
- Seller-list scraping: the whole business asset is the vetted seller list. Cloudflare bot rules +
  per-IP rate limits on catalogue endpoints + contact behind verification. Consider a soft cap on
  contact reveals per buyer per day (default: 20).
- Spam leads: honeypot field, timing check (submissions faster than 3 s are suspect), phone
  verification, per-phone rate limits, and an admin `SPAM` status.
- Image uploads: magic-byte check, re-encode through sharp (which neutralises embedded payloads),
  strip EXIF (product photos taken on phones carry the seller's GPS coordinates — a real privacy
  leak, and one nobody thinks about).

## 4. Performance budgets

| Metric | Budget | Enforced by |
|---|---|---|
| LCP (mobile, 4G) | < 2.0 s | Lighthouse CI |
| CLS | < 0.1 | Lighthouse CI |
| INP | < 200 ms | Lighthouse CI + field data |
| TTFB | < 600 ms | Server logs |
| Initial JS (public route) | < 200 KB gz | `size-limit` in CI |
| Product image (largest) | < 120 KB | Pipeline enforces |
| Search API p95 | < 200 ms at 50k products | Load test |
| Lighthouse Perf / A11y / SEO (mobile) | ≥ 90 / 100 / ≥ 95 | CI, blocking |

## 5. Launch runbook

**T-7 days** — production env vars set and validated · DNS TTL lowered to 300 s · Cloudflare
configured · TLS verified · backup cron running and one dump downloaded and opened · **restore
rehearsal into a scratch DB, elapsed time recorded** · Sentry and uptime alerts firing to a real
inbox · admin account created with a strong password · real categories loaded · CMS content
finalised and legal copy approved.

**T-1 day** — final `pnpm verify` on the release tag · full regression pass · smoke test on
production with seed data · **seed data wiped** · client sign-off recorded.

**Launch day** — deploy the tagged release · verify `/api/health` · walk all three CUJs on
production, on a real phone · submit one real inquiry end to end and confirm the SMS, both emails and
both notifications · check sitemap and robots · submit to Google Search Console · raise DNS TTL back
· monitor for 4 hours.

**T+48 hours** — review Sentry, check delivery rates for email and SMS, review the lead funnel for
drop-off, confirm the first real backup restored cleanly, hold a client check-in.

**Rollback** — `ssh deploy@host && ./infra/deploy.sh rollback <previous-tag>`. Because migrations
are expand-then-contract (`02-ARCHITECTURE.md` §6), the previous image runs against the current
schema. Target: under 5 minutes. **Rehearse this once in Phase 6** — a rollback procedure that has
never been executed is a hypothesis.

## 6. Handover package

1. Repository access with a tagged `v1.0.0` release.
2. `docs/` (this plan set), kept current with what was actually built.
3. OpenAPI at `/api/docs`.
4. Deployment guide: provision → deploy → rollback, with every command.
5. Backup & recovery runbook, including the **measured** restore time.
6. Admin user manual with screenshots, written for a non-technical reader.
7. Credentials handover via a password manager — never email or chat.
8. A recorded walkthrough (30–45 min) of the admin panel and the deploy process.
9. AMC scope confirmation, restating the exclusions both quotations carry.

## 7. Post-launch, first 90 days

Weekly: Sentry triage, uptime review, backup verification, the funnel metrics from `01-PRD.md` §6.

Watch specifically:
- **OTP verification rate.** Below 40%, switch to email verification — a config flag.
- **Admin approval turnaround.** Above 48 h, the community office needs a nudge or a digest email;
  this metric predicts seller churn better than any other.
- **Leads per seller.** Below 1/month, the catalogue is too thin or search is not surfacing the right
  products — investigate before sellers disengage, because re-engaging a lapsed seller is far harder
  than keeping one.
- **Search queries returning zero results.** Log them; they are a free roadmap of what the catalogue
  is missing and which categories to recruit sellers into.
