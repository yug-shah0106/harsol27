# Things to address later

A running list of everything deliberately deferred. Updated at the end of every phase.
Tick an item and note the date when it is done.

## Before launch (blocking)

The complete list, with owners and how each is verified, is `docs/13-GO-LIVE-CHECKLIST.md`; the
automatic part runs with `scripts/preflight.ts`.

- [ ] **Production domain name.** Decide and register; point it at the hosting (Phase 8).
- [ ] **Verified email sending domain** in Resend (SPF, DKIM, DMARC on the domain's DNS). Until then
      emails go through Resend's test sender, which only delivers to the Resend account's own address,
      so lead confirmations to visitors and every seller email (decisions, inquiries, renewal
      reminders) are **not delivered**. Then set `EMAIL_FROM` to an address on it.
- [ ] **Hosting on AWS**: choose the service and region, and put Cloudflare in front (switch
      `CLIENT_IP_HEADER` to `cf-connecting-ip`). Backups, restore and monitoring are built (Phase 8);
      they need a second R2 bucket for off-site copies and an uptime monitor account.
- [ ] **Legal review of Terms and Privacy** (`/terms`, `/privacy`), then remove the "Draft" notices.
- [ ] **Privacy contact**: an address people can write to about their data (needed on the Privacy page).
- [ ] **Rotate secrets that were shared in chat**: the Neon database password and the Resend API key.
- [ ] **Remove `ALLOW_CONSOLE_SMS`** from the server settings once the SMS provider works. A production
      build refuses to start with the log-only code sender unless this is set (Phase 7).
- [ ] **Manual accessibility pass** with a keyboard and a screen reader (NVDA or VoiceOver) over the
      main journeys. The automated checks cover every page but find only part of the real problems.
- [ ] **SMS provider for one-time codes**: MSG91 is dropped (2026-10-08); a provider is still to be
      chosen. Indian SMS needs DLT entity and template registration, which takes days. Then add its
      sender in `src/server/sms.ts`. Until then codes are only written to the server log
      (`SMS_PROVIDER=console`), so **real users cannot sign in**.
- [ ] **Document storage on Cloudflare R2**: create a private bucket and an R2 API token, put them in
      `deploy/.env` (`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`), then run
      `scripts/storage-setup.ts` once. Staging over ngrok needs this too: browsers outside your machine
      cannot reach the local storage server.

## Staging

- [ ] **ngrok domain** for staging: put it in `deploy/.env` as `APP_URL`, add `NGROK_AUTHTOKEN`.

## Brand and content

- [ ] **Logo**. Currently a text wordmark "Harsol27" and a placeholder kite icon. Replace the wordmark in
      `src/components/site-header.tsx`; redraw the icon in `scripts/make-icons.ts` and run it (favicon, app icons).
- [ ] **Review the 18 starting industries** (editable in Admin → Industries).
- [ ] **More languages** (e.g. Gujarati). English only for now. Will need translated copy, a Gujarati
      font (e.g. Noto Sans Gujarati) and a language switcher.

## Decisions due in later phases

- [ ] Phase 3 follow-up: should staff also record **GSTIN / PAN numbers** as text, for searching?

- [ ] **How sellers pay and renew**: the price and payment details to show sellers (on their
      Subscription page and in reminder emails). Today they are told to reply to a reminder or contact
      the team; replies go to the team alert address (`TEAM_ALERT_EMAILS`).

## Technical follow-ups

- [ ] Error tracking with stack traces across releases (e.g. Sentry). Today errors are JSON lines in
      the app log with a reference number shown to the user; enough for one server, not for many.

- [ ] Rate-limit public pages (search especially) at Cloudflare once it is in front. Searches are fast
      (5–41 ms at 100,000 products, `docs/12-SECURITY-REVIEW.md`) but not limited per visitor.
- [ ] Prisma's Postgres adapter triggers a deprecation warning in the `pg` driver (two queries at once
      on one connection inside a transaction). Harmless on `pg` 8; upgrade Prisma before `pg` 9.
- [ ] Search passes matching seller ids as a list; past ~30,000 sellers matching one word, switch to the
      `= ANY(ARRAY(SELECT …))` form (noted in `src/server/catalog.ts`).
- [ ] Consider automatic dependency update pull requests (GitHub Dependabot). CI already fails on any
      high or critical advisory in the app's packages.

- [ ] Measure the home page on the real server (Phase 8). Under slow-4G phone emulation on a local
      machine its main content appears in about 0.8 s (target 2.5 s). Every page is rendered per
      request because of the nonce-based security policy; if the target is missed in production,
      consider hash-based CSP (Next.js SRI) for public pages.
- [ ] The 3D library is about 237 KB compressed (budget 260 KB, checked by `tests/e2e/home-3d.spec.ts`),
      loaded only after the page on capable devices. Brotli at Cloudflare would shrink it further.
- [ ] **Web Push** is not built (email only, 2026-10-08). Revisit if sellers want instant alerts; on
      iPhone it only works once the app is installed to the home screen.
- [ ] Review rate-limit values once real traffic exists (lead form: 10 per hour per IP; staff
      sign-in: 10 per 15 minutes per IP, account locks after 5 wrong passwords; inquiries: no daily
      cap, but 20 per 10 minutes per buyer and 60 per hour per network, against automated harvesting).
- [ ] Search finds every word anywhere in a listing but is not typo-tolerant ("khakra" will not find
      "khakhra"). If buyers need it, add similarity matching with the trigram indexes already in place.
- [ ] Product photos of public listings are cached for a year by browsers (and later the CDN). If a
      seller hides a product, copies already cached elsewhere can still be seen by URL.
- [ ] Neon (managed Postgres) could replace the self-run database when moving to AWS: use a new,
      empty database, not the existing `neondb`.

## Done

- [x] 2026-10-08: team alert email set (`harsol27helpdesk@gmail.com`).
- [x] 2026-10-08: IP address and browser details on leads deleted automatically after 30 days.
- [x] 2026-10-08: old `client/` and `server/` folders removed.
- [x] 2026-10-08: seller documents decided: GST certificate, PAN card, Udyam/business registration
      certificate, address proof (e.g. electricity bill). GST certificate optional; 5 MB per document.
- [x] 2026-10-09: launch readiness (Phase 8): nightly test-restored backups with off-site copies and a
      one-command restore, monitoring and daily alert email, deploy and rollback script, go-live check
      and checklist (`docs/13-GO-LIVE-CHECKLIST.md`, `deploy/README.md`).
- [x] 2026-10-08: security, testing and performance review (Phase 7): `docs/12-SECURITY-REVIEW.md`.
- [x] 2026-10-08: 3D scene left to us: Uttarayan kites, generated in code (no model files). No Web
      Push; the app is installable, with an offline page (Phase 6).
- [x] 2026-10-08: one yearly plan; reminders 30, 7 and 1 days before paid-until plus an expiry notice;
      weekly renewal list to the team (Phase 5).
- [x] 2026-10-08: no daily inquiry cap; up to 50 photos per product, 10 MB each; seller inquiry
      notifications by email only.
