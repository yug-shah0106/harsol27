#!/usr/bin/env bash
# Deploys a version of Harsol27 on this server, or rolls back to an earlier one.
#   deploy/deploy.sh             # the latest main
#   deploy/deploy.sh 2cb08e9     # a specific version (see deploy/deployments.log)
# Migrations run before the new app starts. They only move forward: rolling back past a version
# that changed the database needs the restore steps in deploy/README.md.
set -euo pipefail
cd "$(dirname "$0")/.."

ref="${1:-origin/main}"
compose=(docker compose -f deploy/compose.yml) # also reads deploy/.env (COMPOSE_PROFILES too)

[ -f deploy/.env ] || { echo "deploy/.env is missing: copy deploy/.env.example and fill it in." >&2; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "This checkout has local changes; refusing to deploy over them." >&2; exit 1; }

git fetch --quiet origin
git checkout --quiet --detach "$ref"
version=$(git rev-parse --short HEAD)
previous=$(tail -n 1 deploy/deployments.log 2>/dev/null | awk '{print $2}' || true)
echo "Deploying $version${previous:+ (currently $previous)}…"

# Every long-running service in the active profiles (COMPOSE_PROFILES in deploy/.env, e.g. ngrok);
# the one-shot migrate job runs first as their dependency.
services=$("${compose[@]}" config --services | grep -vx -e migrate -e tools | tr '\n' ' ')
"${compose[@]}" build --pull
# shellcheck disable=SC2086 # one word per service name
"${compose[@]}" up -d --remove-orphans --wait --wait-timeout 300 $services

for _ in $(seq 1 30); do
  curl -fsS -o /dev/null http://127.0.0.1:3000/api/health && break
  sleep 2
done
curl -fsS http://127.0.0.1:3000/api/health >/dev/null || { echo "The app is not answering; see: ${compose[*]} logs app" >&2; exit 1; }

echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') $version" >> deploy/deployments.log
echo "Deployed $version.${previous:+ To roll back: deploy/deploy.sh $previous}"
