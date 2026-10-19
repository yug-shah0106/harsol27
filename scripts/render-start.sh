#!/bin/bash
# Render free plan (the Dockerfile's `render` target): one container sets up the database, then runs
# the worker and the website side by side. 512 MB in all, so the setup runs first, on its own.
set -e
prisma migrate deploy
tsx prisma/seed.ts --if-empty
# First admin from ADMIN_EMAIL / ADMIN_PASSWORD (Render env vars); skipped once the account exists.
if [ -n "${ADMIN_EMAIL:-}" ]; then
  printf '%s\n' "${ADMIN_PASSWORD:-}" | tsx scripts/staff.ts create --if-missing --email "$ADMIN_EMAIL" --name "${ADMIN_NAME:-Admin}" --role ADMIN
fi
set +e

# NODE_OPTIONS is for the worker only: the website does not start with it.
NODE_OPTIONS=--conditions=react-server node --import tsx src/worker.ts &
node web/server.js &
# If either one stops, stop the other and the container, so Render restarts it and the log shows why.
# Render stops the container with SIGTERM; as the container's first process bash ignores it unless trapped.
trap 'kill $(jobs -p) 2>/dev/null' TERM INT
wait -n
kill $(jobs -p) 2>/dev/null
wait
exit 1
