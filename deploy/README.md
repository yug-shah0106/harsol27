# Running Harsol27 on a server

One Docker Compose stack on one server:

| Service | What it does |
|---|---|
| `db` | PostgreSQL 18. Not reachable from outside the server. |
| `migrate` | Applies database changes, then exits. The new app starts only after it succeeds. |
| `app` | The website (Next.js), on `127.0.0.1:3000`. A tunnel or proxy puts it on the internet. |
| `worker` | Background jobs: emails, photo processing, reminders, the daily health check. |
| `backup` | Nightly database backups, each one test-restored, optionally copied off-site. |
| `ngrok` | Optional (`COMPOSE_PROFILES=ngrok`): the public staging address. |
| `s3` | Optional (`COMPOSE_PROFILES=local-s3`): local file storage when there is no R2 bucket yet. |

Every command below is run from the repository root on the server.

## First-time setup

1. **Install** Docker with Compose v2, and git. Clone this repository.
2. **Settings:** `cp deploy/.env.example deploy/.env`, then fill in every value. The file explains
   each one. Generate secrets with `openssl rand -base64 32` (sign-in) and `openssl rand -hex 24`
   (database). `deploy/.env` is never committed.
3. **Deploy:** `deploy/deploy.sh`. It builds, applies migrations, starts everything, waits until
   it is healthy, and takes the first backup straight away.
4. **File storage:** creates the bucket if needed and allows browser uploads from `APP_URL` only.

   ```bash
   docker compose -f deploy/compose.yml run --rm tools tsx scripts/storage-setup.ts
   ```

5. **Industries:** loads the starting list. Safe to re-run; it never overwrites edits.

   ```bash
   docker compose -f deploy/compose.yml run --rm tools tsx prisma/seed.ts
   ```

6. **First admin:** you are asked for the password twice; it is never shown.

   ```bash
   docker compose -f deploy/compose.yml run --rm tools tsx scripts/staff.ts create --email you@company.com --name "Your Name" --role ADMIN
   ```

7. **Uptime monitor:** in a free monitor (for example UptimeRobot or Better Stack), check
   `https://harsol27.com/api/health/full` every 5 minutes and alert the team by email and phone.
   See "Monitoring" below for what it covers.
8. **Go-live check:** `docker compose -f deploy/compose.yml run --rm tools tsx scripts/preflight.ts`.
   It lists everything that still blocks launch (see `docs/13-GO-LIVE-CHECKLIST.md`).

## Deploying a new version, and rolling back

```bash
deploy/deploy.sh             # the latest main
deploy/deploy.sh 2cb08e9     # a specific version
```

Each deploy is added to `deploy/deployments.log` (time and version), and the script prints the
command that goes back to the version before. Rolling back the code is safe. **Database changes are
not undone:** if the version you are leaving changed the database, a rollback can also need a
restore (below). Each version's pull request says whether it has a migration.

The site is unavailable for a few seconds while the new app starts.

## Backups

**When:** every night at 02:30 India time (`BACKUP_AT_UTC`), and once when the server is new.

**Each backup:**
1. dumps the whole database to `/backups` in the `backup` container (a Docker volume)
2. restores it into a scratch database, to prove the file is good
3. copies it off-site, if `BACKUP_S3_*` is set
4. deletes local copies older than `BACKUP_KEEP_DAYS` (14)
5. records the result, which the monitoring reads

Off-site copies are required before launch: a lost server must not mean lost data. Use a separate
private bucket with its own key, and set a lifecycle rule there that deletes copies after 90 days.

**Check them:**

```bash
docker compose -f deploy/compose.yml logs --tail 20 backup   # "Backup OK: … test-restored, copied off-site"
deploy/restore.sh                                            # lists the backups on this server
docker compose -f deploy/compose.yml exec backup /backup/backup.sh   # take one now (e.g. before a risky change)
```

Uploaded documents and photos live in Cloudflare R2, which keeps its own redundant copies. They are
not in these backups.

## Restoring the database

```bash
deploy/restore.sh harsol27-20261009T210000Z.dump
```

You are asked to type `restore`. The script then:
1. stops the app and worker
2. restores the backup into a new database, and only if that fully succeeds, puts it in place of the live one
3. starts the app and worker again

The site is down for the minute or two this takes. Anything saved after that backup was taken is
lost; that is what a restore means.

The previous database is kept as `harsol27_before_restore_<time>`, so a restore can be undone. Once
you are sure, delete it:

```bash
docker compose -f deploy/compose.yml exec backup dropdb harsol27_before_restore_<time>
```

A backup that is no longer on the server is fetched from off-site storage automatically.

**Practise it.** Restore onto a spare server, or a copy of this one, once a quarter. A backup is
only as good as the last time it was restored. The nightly test-restore checks each file, but not
your team's ability to use it under pressure.

## Monitoring

| What | Where | Who hears about it |
|---|---|---|
| The site is up | `/api/health` (database answers) | Docker restarts the app if it fails |
| Everything works | `/api/health/full`: database, worker running (checks in every minute), a successful backup in the last 26 hours | The external uptime monitor (step 7). It only says `ok` or `degraded`; the reasons are in the app log. |
| Things worth a look | Daily at 09:15 India time: backups, the worker, background jobs that failed after every retry (for example an email Resend kept refusing) | Email to `TEAM_ALERT_EMAILS`, **only when something is wrong**. A quiet inbox means all is well. |
| Logs | `docker compose -f deploy/compose.yml logs -f app worker backup` | Each service keeps at most 5 × 10 MB, so logs never fill the disk. |

## When something is wrong

- **Site down** (the uptime monitor alerts):
  1. Run `docker compose -f deploy/compose.yml ps`. Every service should be `running` or `healthy`; `migrate` should be `exited (0)`.
  2. Read `docker compose -f deploy/compose.yml logs --tail 100 app` for the error.
  3. If the last deploy caused it, roll back with `deploy/deploy.sh <previous version>`.
- **Degraded:**
  1. Run `docker compose -f deploy/compose.yml logs --tail 50 app | grep degraded`; the log line lists the problems.
  2. A stopped worker: `docker compose -f deploy/compose.yml up -d worker`.
  3. A failed backup: read `docker compose -f deploy/compose.yml logs backup`.
- **The app will not start, and the log mentions a setting:** the app refuses to run with missing or
  unsafe settings. Fix `deploy/.env`, then run `deploy/deploy.sh` again.
- **Disk full:** run `docker system df`. Old images can go with `docker image prune`. Backups older than
  `BACKUP_KEEP_DAYS` are removed automatically.

## Staff accounts

```bash
docker compose -f deploy/compose.yml run --rm tools tsx scripts/staff.ts create       --email … --name … --role ADMIN|VIEWER
docker compose -f deploy/compose.yml run --rm tools tsx scripts/staff.ts set-password --email …   # also unlocks + signs out
docker compose -f deploy/compose.yml run --rm tools tsx scripts/staff.ts disable      --email …   # blocks + signs out
docker compose -f deploy/compose.yml run --rm tools tsx scripts/staff.ts enable       --email …
```

## Changing a secret

1. Put the new value in `deploy/.env`.
2. Run `deploy/deploy.sh` to restart with it.
3. Revoke the old value at its provider (R2, Resend, ngrok, SMS).

Changing `BETTER_AUTH_SECRET` signs everyone out. Changing `POSTGRES_PASSWORD` also needs the
password changed inside the database first:

```bash
docker compose -f deploy/compose.yml exec db psql -U harsol27 -c "ALTER USER harsol27 PASSWORD '<new>'"
```

## Staging only: phone sign-in codes

Until an SMS provider is connected, `SMS_PROVIDER=console` writes codes to the app log instead of
texting them. That only runs with `ALLOW_CONSOLE_SMS=true`, which must be removed at launch.

```bash
docker compose -f deploy/compose.yml logs app | grep "console SMS"
```
