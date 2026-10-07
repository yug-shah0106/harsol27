# Deploying Harsol27

One Docker Compose stack: PostgreSQL, a one-shot migration job, and the Next.js app.
Staging is exposed through an ngrok reserved domain. Permanent hosting (AWS) is not decided yet;
this stack is what will run there.

## First-time setup

1. Install Docker (with Compose v2).
2. `cp deploy/.env.example deploy/.env` and fill in every value:
   - `APP_URL`: `https://<your-domain>.ngrok.app` for staging, or `http://localhost:3000` locally.
   - `BETTER_AUTH_SECRET`: `openssl rand -base64 32`
   - `POSTGRES_PASSWORD`: `openssl rand -hex 24`
   - `NGROK_AUTHTOKEN`: from the ngrok dashboard.
3. Start everything (migrations run automatically before the app starts):

   ```bash
   docker compose -f deploy/compose.yml --profile ngrok up -d --build
   ```

4. Create the first admin. You will be asked for the password twice; it is never echoed:

   ```bash
   docker compose -f deploy/compose.yml run --rm tools tsx scripts/staff.ts create --email you@company.com --name "Your Name" --role ADMIN
   ```

## Updating to a new version

```bash
git pull
docker compose -f deploy/compose.yml --profile ngrok up -d --build
```

`migrate` applies any new migrations and exits; `app` restarts only after that succeeds.

## Staff accounts

```bash
docker compose -f deploy/compose.yml run --rm tools tsx scripts/staff.ts create       --email … --name … --role ADMIN|VIEWER
docker compose -f deploy/compose.yml run --rm tools tsx scripts/staff.ts set-password --email …   # also unlocks + signs out
docker compose -f deploy/compose.yml run --rm tools tsx scripts/staff.ts disable      --email …   # blocks + signs out
docker compose -f deploy/compose.yml run --rm tools tsx scripts/staff.ts enable       --email …
```

## Checks

- Health: `curl -s http://127.0.0.1:3000/api/health` → `{"status":"ok"}`
- Logs: `docker compose -f deploy/compose.yml logs -f app`

## Not yet covered (later phases)

Backups and restore rehearsal, monitoring and Cloudflare in front are part of Phase 8 (launch),
once the AWS hosting decision is made.
