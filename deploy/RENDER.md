# Running Harsol27 on Render with Aiven PostgreSQL

The alternative to the one-server Compose stack (README.md): one free Render web service runs the
`vanshshah0310/harsol27-app` image from Docker Hub, Aiven runs the database, Cloudflare R2 keeps the files.

The image is the Dockerfile's `render` target. At every start (`scripts/render-start.sh`) it applies
database changes, fills an empty industry list, creates the first admin if it is missing, then runs
the background worker and the website side by side. Nothing has to be run by hand, and no Docker
command is set in Render. If either the worker or the website stops, the container stops and Render
restarts it.

## Build and push a version

From the repository root. Render runs `linux/amd64`, so the platform flag matters on an Apple Silicon Mac.

```bash
docker login -u vanshshah0310
TAG=$(git rev-parse --short HEAD)
docker buildx build --platform linux/amd64 --target render -t vanshshah0310/harsol27-app:$TAG -t vanshshah0310/harsol27-app:latest --push .
```

Then in Render: **Manual Deploy → Deploy latest reference** (Render does not pull a new `latest` by itself).

## Aiven

1. Create an Aiven for PostgreSQL service. Postgres 17 or newer.
2. From its overview page copy the **Service URI**
   (`postgres://avnadmin:…@….aivencloud.com:12345/defaultdb?sslmode=require`) and download the
   **CA certificate** (`ca.pem`). Aiven signs its certificates with its own CA, so the app needs that
   file to verify the connection. To use a database created in the service's **Databases** tab,
   replace `defaultdb` in the URI with its name.

## Render web service

**New → Web Service → Existing Image** `docker.io/vanshshah0310/harsol27-app:latest`. Instance type
Free, health check path `/api/health`, Docker command empty.

- **Secret file** `aiven-ca.pem`, with the contents of `ca.pem` (Render puts it at `/etc/secrets/aiven-ca.pem`).
- `DATABASE_URL`: the Aiven Service URI. With the CA below, `sslmode=require` encrypts and verifies the
  certificate; it also logs a harmless "SECURITY WARNING" on each start, which `sslmode=verify-full`
  would silence.
- `NODE_EXTRA_CA_CERTS=/etc/secrets/aiven-ca.pem`. Without it the database refuses the connection and
  `/api/health` answers `unavailable`.
- `BETTER_AUTH_URL`: the public address, no trailing slash: `https://<name>.onrender.com`, or the custom domain once added.
- `BETTER_AUTH_SECRET`: `openssl rand -base64 32`. Changing it later signs everyone out.
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`: the Cloudflare R2 bucket (see `deploy/.env.example`).
- `RESEND_API_KEY`, `EMAIL_FROM`, `TEAM_ALERT_EMAILS=harsol27helpdesk@gmail.com` (every Seller registration
  is emailed there, and a confirmation to the person who registered). Until a domain is verified in Resend, use
  `EMAIL_FROM=Harsol27 <onboarding@resend.dev>`; Resend then delivers only to the Resend account's own address,
  so neither the helpdesk nor registrants get anything.
- `CLIENT_IP_HEADER=cf-connecting-ip`. Render sits behind Cloudflare and appends to `X-Forwarded-For`
  without clearing it, so the right-most entry is a proxy, not the visitor. Check it once after the
  first deploy: sign-in rate limits must not lock out everyone at once.
- `COMING_SOON=true` until launch.
- `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` (at least 12 characters): the first admin, created at
  the next start. Once the log says `Created ADMIN account`, delete `ADMIN_PASSWORD`; the account and
  its password stay. Staff sign in at `/staff/sign-in`.

Do not set `NODE_OPTIONS`: the start script gives it to the worker only, and the website does not start with it.

## File storage CORS

Browsers upload straight to the bucket, so it must allow the site's address. Once the real R2 keys
are set, add this under the bucket's **Settings → CORS Policy** in Cloudflare (and again whenever
`BETTER_AUTH_URL` changes, for example when the custom domain is added):

```json
[{ "AllowedOrigins": ["https://<name>.onrender.com"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["content-type"], "MaxAgeSeconds": 3600 }]
```

## Known differences from the Compose stack

- **Free web service:** sleeps after 15 minutes without visitors, and the worker sleeps with it: emails
  wait until the next visit (about a minute to wake), and scheduled jobs such as the daily check can be
  missed. Before launch, move to a paid instance (it never sleeps).
- **Memory:** the free plan has 512 MB. The website and the worker use about 340 MB together.
- **Backups:** Aiven backs the database up itself; the `backup` service does not run here. Until that
  is settled, `/api/health/full` reports `degraded` and the daily check emails "No database backup has
  succeeded yet".
- **Connections:** Aiven's free plan allows 20. The website opens at most 7 (5 for pages, 2 for jobs) and
  the worker at most 10 (5 + 5), so both fit (`src/server/db.ts`, `src/server/jobs.ts`). A page waits up to
  10 seconds for a free connection: the free instance has a tenth of a CPU, and the first page after it
  wakes can be slow (before 2026-10-21 Prisma gave up after 2 seconds and the admin overview failed).
