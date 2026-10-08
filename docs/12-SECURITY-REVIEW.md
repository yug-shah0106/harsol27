# Security, testing and performance review (Phase 7)

Reviewed 2026-10-08, on the code at the end of Phase 7. Every place a request enters the app was
read: all 30 pages, every server action, the 4 route handlers, sign-in, uploads, background jobs and
the deployment files. Each control listed below is backed by an automated test, so it is re-checked
on every pull request.

## What was fixed in this phase

| # | Severity | Problem | Fix |
|---|---|---|---|
| 1 | Medium | Until an SMS provider is connected, sign-in codes are written to the server log. If the site launched like that, anyone who can read the logs could sign in as any buyer or seller. | A production build now **refuses to start** with the log-only sender unless `ALLOW_CONSOLE_SMS=true` is set, which is for staging only (`deploy/.env.example` says to remove it at launch). Test: `src/server/env.test.ts`. |
| 2 | Medium | Search read every product on every query (about 350–490 ms at 100,000 products). That is slow, and it is an easy way to overload the database with repeated searches. | Matching industries and sellers are looked up first, so the product query can use its indexes; a text index was added on seller names. Now 5–41 ms. See "Performance" below. |
| 3 | Low | A dependency of Better Auth (`mysql2`, for MySQL, which we do not use) had two published advisories; the `shadcn` command-line tool was listed as an app dependency and brought another (`braces`). | `mysql2` pinned to a fixed version; `shadcn` moved to development tools. The production audit is clean, and CI now fails on any high or critical advisory (`pnpm audit --prod --audit-level high`). |
| 4 | Low | Next.js's built-in "not found" and error pages use inline styles, which our Content Security Policy blocks, so they appeared unstyled. | Branded 404, error and last-resort error pages. They never show error details; the error page shows a reference number that matches the server log. |

## Controls in place, and the test that proves each

| Area | What protects it | Test |
|---|---|---|
| **Who can open what** | Every private page and route checks access on the server itself, not only in menus. A static test fails the build if a new admin, seller or account page forgets to. Every admin action that changes data requires an Admin (Viewers are refused on the server). | `src/app/pages-guard.test.ts`, `src/app/admin/actions-guard.test.ts`, `tests/e2e/access.spec.ts` (each kind of user × every private page) |
| **Sellers only touch their own data** | Every product and photo action checks that the item belongs to the signed-in seller. Another seller's product answers "not found". | `src/server/products.test.ts`, `tests/e2e/access.spec.ts` |
| **Seller contact details** | Hidden by default by the database client; one function decides who may see them; a test fails the build if any other code reads them. They are not in the page at all until an inquiry is sent. | `src/server/contact-access*.test.ts`, `tests/e2e/marketplace.spec.ts` |
| **Staff sign-in** | Passwords hashed with argon2id. One message for every failure (no hint whether an account exists), with equal timing. Lockout after 5 wrong passwords for 15 minutes; 10 attempts per 15 minutes per network. Staff sessions end when the browser closes and last at most 12 hours. | `src/server/staff-policy.test.ts`, `tests/e2e/staff-auth.spec.ts`, `tests/e2e/security-headers.spec.ts` |
| **Phone sign-in** | Codes are stored only as keyed hashes, expire in 5 minutes, allow 5 attempts and work once. Limits: 3 codes per 15 minutes per number, 10 per hour per network. | `src/server/otp.test.ts`, `tests/e2e/sellers.spec.ts` |
| **Session cookies** | `HttpOnly` (scripts cannot read them), `SameSite=Lax` (not sent with other sites' requests), `Secure` on HTTPS. | `tests/e2e/security-headers.spec.ts` |
| **Forged requests from other sites** | Next.js rejects a server action whose Origin is not this site, before the action runs. | `tests/e2e/security-headers.spec.ts` (the real lead-form action, posted from this site and from another) |
| **Script injection (XSS)** | React escapes all output; no raw HTML anywhere in the code. A per-request nonce-based Content Security Policy blocks any script we did not send. All user text in emails is escaped. | `tests/e2e/security-headers.spec.ts`, CSP checks on every page in `tests/e2e/accessibility.spec.ts`, `src/server/*-emails.test.ts` |
| **Database injection** | All queries go through Prisma with parameters. The three raw queries use Prisma's safe tagged templates. | Code review |
| **File uploads** | Files go straight to private storage through 5-minute links locked to the declared type and size. The first bytes are checked (a renamed file is refused). Images are limited to 60 megapixels (no "decompression bombs"), re-encoded with location data removed, and the originals deleted. Documents open only for staff, through 60-second links. | `src/server/sellers.test.ts`, `src/server/products.test.ts`, `tests/e2e/sellers.spec.ts`, `tests/e2e/marketplace.spec.ts` |
| **Hidden listings** | Hidden, removed, unpaid or suspended listings answer "not found" to the public, and so do their photos. | `src/server/visibility.test.ts`, `tests/e2e/journeys.spec.ts`, `tests/e2e/marketplace.spec.ts` |
| **Abuse limits** | Rate limits on the lead form, sign-in, codes, uploads and inquiries (no daily cap on inquiries, by decision). | `src/server/rate-limit.test.ts`, feature tests |
| **Security headers** | HSTS, `nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, strict referrer policy, permissions policy, no `X-Powered-By`. | `tests/e2e/security-headers.spec.ts` |
| **Personal data** | IP address and browser details on leads and inquiries are erased after 30 days. The installable app never stores pages on the device. | `src/server/retention.test.ts`, `tests/e2e/pwa.spec.ts` |
| **Secrets** | Never committed: a scan of the whole git history found none, and no `.env` file was ever committed. Settings are validated at start-up, so a missing or weak one stops the app. | `src/server/env.test.ts` |
| **Server setup** | The app runs as a non-root user in Docker; the app and database ports are bound to the server itself only; the database is not exposed. | `deploy/compose.yml`, `Dockerfile` |

## Tests by role

| Role | Journeys covered end to end |
|---|---|
| Visitor | Home page (with and without 3D), search, industries, product and seller pages, lead form, sign-in, not-found page, offline page, keyboard-only search |
| Buyer | Phone sign-in, inquiry from a product and from a seller profile, contacts unlocked, "My inquiries", sign out |
| Seller | Application with documents, rejection and resubmission, approval, products (add, edit, photos: add, reorder, delete), hide and show, inquiries received, subscription page; suspension takes listings offline and reinstatement restores them |
| Admin | Leads, industries, seller decisions, product removal and restore, inquiries with their source, subscriptions and payments |
| Viewer | Every admin page, read only: no controls, and changes refused on the server |

Accessibility: automated WCAG 2.1 A/AA checks on every page, for every role (`tests/e2e/accessibility.spec.ts`).
Automated checks find roughly a third of real problems, so one manual pass with a keyboard and a
screen reader is still planned before launch.

## Performance

**Page speed.** Measured under Lighthouse's mobile conditions (4× slower CPU, slow 4G), on a local
server. The target is the main content within 2.5 s and a layout shift under 0.1.

| Page | Main content shown | Layout shift |
|---|---|---|
| Home (3D) | ~0.8 s | 0 |
| Search, industries, industry, product, seller, lead form | 0.76–0.83 s | 0–0.001 |

Checked on every pull request by `tests/e2e/performance.spec.ts` and `tests/e2e/home-3d.spec.ts`,
together with the size budget for the 3D scene.

**Search at scale.** `scripts/search-benchmark.ts` fills a throwaway database with 5,000 sellers and
100,000 products and times the real queries (median of 15 runs):

| Query | Before | After |
|---|---|---|
| One word ("khakhra", in ~8% of products) | 343 ms | 41 ms |
| Two words | 376 ms | 14 ms |
| A company name | 197 ms | 31 ms |
| No match | 491 ms | 5 ms |
| One industry, page 40, industry counts | 15–38 ms | unchanged |
| Sitemap (every public page) | 115 ms | 108 ms |

## Still to do before launch

These are in `docs/FUTURE.md`:
- connect an SMS provider and remove `ALLOW_CONSOLE_SMS`
- rotate the secrets that were shared in chat
- verify the email domain
- put Cloudflare in front, which also rate-limits public pages such as search
- backups with a tested restore
- a manual keyboard and screen-reader pass

Development-only tools still carry one advisory (`braces`, inside the `shadcn` command-line tool).
It never runs in the live app.

## How to re-run

```bash
pnpm verify                        # lint, types, unit and integration tests, build
pnpm test:e2e                      # browser journeys, access, accessibility, performance
pnpm audit --prod --audit-level high
```

The search benchmark's own instructions are at the top of `scripts/search-benchmark.ts`.
