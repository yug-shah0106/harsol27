# Go-live checklist

Everything that must be true before real users arrive.

Items marked **(automatic)** are verified by the go-live check:

```bash
docker compose -f deploy/compose.yml run --rm tools tsx scripts/preflight.ts
```

It prints each check and stops with an error while anything blocks launch. The rest are confirmed
by a person. How to run the server is in `deploy/README.md`.

## Built and ready (Phases 1–8)

The four parts of the brief, with security, tests on every pull request, the 3D home page and the
installable app. Also ready:
- nightly backups that are test-restored and optionally copied off-site, and a one-command restore
  that can be undone
- monitoring: a full health check for an uptime monitor, the worker's heartbeat, and a daily email
  to the team when anything needs attention
- capped logs, and one-command deploys and rollbacks with a history
- the go-live check itself

A full staging rehearsal of all of this ran on a local machine: deploy, first backup, off-site copy
verified byte for byte, a data-loss restore including from off-site, rollback, and the worker-down
and backup-failure alarms.

## Waiting on the client

| # | Item | Why it matters | Verified by |
|---|---|---|---|
| 1 | **Domain name**, registered in the client's account | The site's permanent address | (automatic) "uses its own domain" |
| 2 | **Hosting decision (AWS)** and a server. A sensible start is 2 vCPUs, 4 GB memory, 40 GB disk, Ubuntu LTS. | Somewhere to run the stack. Photo processing needs the memory. | Deploys and stays healthy |
| 3 | **Cloudflare** in front of the domain (DNS, HTTPS, firewall). Then set `CLIENT_IP_HEADER=cf-connecting-ip` and add a rate-limit rule for `/search` and the forms. | Protection from abuse, and real visitor addresses for the rate limits | (automatic) "visitor addresses come from Cloudflare" |
| 4 | **Cloudflare R2**: a private bucket for files, and an API token for that bucket only | Seller documents and product photos | (automatic) "files are stored in real storage", "file storage answers" |
| 5 | **A second R2 bucket for backups**, with its own token, and a lifecycle rule deleting copies after 90 days | A lost server must not mean lost data | (automatic) "backups are copied off the server" |
| 6 | **SMS provider for sign-in codes**, with DLT registration of the sender ID and the code template (allow several days) | Buyers and sellers cannot sign in without it | (automatic) "sign-in codes are sent by SMS"; then remove `ALLOW_CONSOLE_SMS` |
| 7 | **Email domain verified in Resend** (SPF, DKIM, DMARC records in DNS), and `EMAIL_FROM` set to an address on it | Without it, every email goes to spam or is not delivered | (automatic) "emails come from our own domain", "email domain is verified" |
| 8 | **Legal review** of `/terms` and `/privacy`, then remove the "Draft" notices | Required before collecting real personal data | (automatic) "has been legally reviewed" |
| 9 | **A privacy contact address** for the privacy page | People must be able to ask about their data | Read the privacy page |
| 10 | **How sellers pay and renew**: the price and payment details to show sellers | Renewal reminders currently say "reply to this email" | Read the seller subscription page |
| 11 | **Rotate the secrets shared in chat** (the Neon database password and the Resend key) | Anything pasted into a chat must be treated as exposed | The old values no longer work |
| 12 | **An uptime monitor account** (UptimeRobot, Better Stack or similar) on `/api/health/full` | Someone hears about an outage before users do | Stop the worker for 5 minutes: an alert arrives |
| 13 | **Someone reads the team inbox** (`harsol27helpdesk@gmail.com`) every day | Leads, seller applications and the daily health email go there | — |
| 14 | Logo (optional for launch); review the 18 starting industries | Brand, and the categories sellers choose | — |
| 15 | For staging now: the **ngrok token and reserved domain** | The shared staging address | The site opens at that address |

## To do at launch (developer, with the client)

| # | Item | Verified by |
|---|---|---|
| 16 | Create the staff accounts (Admin and Viewer) for the team | (automatic) "an Admin staff account exists" |
| 17 | One manual accessibility pass, keyboard and screen reader, over the main journeys | A written note of what was checked |
| 18 | Practise a restore on a spare server | The restored site opens and shows the data |
| 19 | Smoke test on the real domain, once per role:<br>1. sign in by SMS<br>2. apply as a seller, then approve the application<br>3. record a payment<br>4. add a product with photos<br>5. send an inquiry and receive the email<br>6. a staff member sees it | Each step works on the live site |
| 20 | The go-live check shows **0 blocking** | (automatic) |

## Launch day

1. Take a backup: `docker compose -f deploy/compose.yml exec backup /backup/backup.sh`
2. Deploy: `deploy/deploy.sh`
3. Run the go-live check (0 blocking) and the smoke test (item 19).
4. Turn on the uptime monitor's alerts.
5. Announce.

## First week

- Every morning: the team inbox has no "needs attention" email; `deploy/restore.sh` lists last night's backup.
- Watch for seller applications and leads, so the first users get quick answers.
- Look at `docker compose -f deploy/compose.yml logs app | grep '"level":"error"'` once a day.
