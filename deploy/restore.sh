#!/usr/bin/env bash
# Restores the database from a backup, on the server: stops the app and worker, restores, and
# starts them again. The current database is kept under another name, so this can be undone.
#   deploy/restore.sh                                   # lists the backups on this server
#   deploy/restore.sh harsol27-20261009T210000Z.dump    # asks you to type "restore" to go ahead
set -euo pipefail
cd "$(dirname "$0")/.."
compose=(docker compose -f deploy/compose.yml)

if [ $# -eq 0 ]; then
  echo "Backups on this server (newest last):"
  "${compose[@]}" exec -T backup ls -1 /backups
  echo "Older ones are in off-site storage; give any file name to restore it."
  exit 0
fi

read -r -p "This replaces the live database with $1 (the current one is kept). Type \"restore\" to go ahead: " answer
[ "$answer" = "restore" ] || { echo "Nothing changed."; exit 1; }

"${compose[@]}" stop app worker
trap '"${compose[@]}" start app worker' EXIT # whatever happens, the site comes back
"${compose[@]}" exec -T backup /backup/restore.sh "$1" --yes
