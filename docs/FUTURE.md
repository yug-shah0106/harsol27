# Things to address later

A running list of everything deliberately deferred. Updated at the end of every phase.
Tick an item and note the date when it is done.

## Before launch (blocking)

- [ ] **Production domain name.** Decide and register; point it at the hosting (Phase 8).
- [ ] **Verified email sending domain** in Resend (SPF, DKIM, DMARC on the domain's DNS). Until then
      emails go through Resend's test sender, which only delivers to the Resend account's own address,
      so lead confirmations to visitors are **not delivered**. Then set `EMAIL_FROM` to an address on it.
- [ ] **Hosting on AWS**: choose the service and region, then backups with a tested restore, uptime
      monitoring, error tracking, and Cloudflare in front (switch `CLIENT_IP_HEADER` to `cf-connecting-ip`).
- [ ] **Legal review of Terms and Privacy** (`/terms`, `/privacy`), then remove the "Draft" notices.
- [ ] **Privacy contact**: an address people can write to about their data (needed on the Privacy page).
- [ ] **Rotate secrets that were shared in chat**: the Neon database password and the Resend API key.

## Staging

- [ ] **ngrok domain** for staging: put it in `deploy/.env` as `APP_URL`, add `NGROK_AUTHTOKEN`.

## Brand and content

- [ ] **Logo**. Currently a text wordmark "Harsol27". Replace in `src/components/site-header.tsx` and the favicon.
- [ ] **Review the 18 starting industries** (editable in Admin → Industries).
- [ ] **More languages** (e.g. Gujarati). English only for now. Will need translated copy, a Gujarati
      font (e.g. Noto Sans Gujarati) and a language switcher.

## Decisions due in later phases

- [ ] Phase 3: which **documents sellers must upload**; **MSG91 account and DLT template approval**
      (takes days; needed before any SMS one-time code can be sent).
- [ ] Phase 4: the **daily inquiry cap** per buyer; product **photo count and size limits**.
- [ ] Phase 5: **one subscription plan or several**; when **renewal reminders** are sent (days before expiry).
- [ ] Phase 6: what the **3D scene** shows and who supplies the models; **Web Push** yes/no.

## Technical follow-ups

- [ ] Revisit page caching in Phase 6: every page is rendered per request because of the strict
      nonce-based security policy. If the home page misses the 2.5 s load target, consider
      hash-based CSP (Next.js SRI) for public pages.
- [ ] Review rate-limit values once real traffic exists (lead form: 10 per hour per IP; staff
      sign-in: 10 per 15 minutes per IP, account locks after 5 wrong passwords).
- [ ] Neon (managed Postgres) could replace the self-run database when moving to AWS: use a new,
      empty database, not the existing `neondb`.

## Done

- [x] 2026-10-08: team alert email set (`harsol27helpdesk@gmail.com`).
- [x] 2026-10-08: IP address and browser details on leads deleted automatically after 30 days.
- [x] 2026-10-08: old `client/` and `server/` folders removed.
