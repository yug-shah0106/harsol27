#!/bin/sh
# Runs backup.sh every night at BACKUP_AT_UTC (default 21:00 UTC = 02:30 India time), and once
# straight away if there is no backup yet (a fresh server is covered from its first hour).
set -eu
at="${BACKUP_AT_UTC:-21:00}"
hour="${at%%:*}"; minute="${at##*:}"
hour="${hour#0}"; minute="${minute#0}" # "08" is eight, not an octal error; "00" becomes 0
hour="${hour:-0}"; minute="${minute:-0}"
trap 'exit 0' TERM INT

if ! ls /backups/harsol27-*.dump >/dev/null 2>&1; then
  echo "No backup yet: running the first one now."
  /backup/backup.sh || true
fi

while true; do
  now=$(date -u +%s)
  next=$(( now / 86400 * 86400 + hour * 3600 + minute * 60 ))
  [ "$next" -gt "$now" ] || next=$(( next + 86400 ))
  echo "Next backup at $(date -u -d "@$next" '+%Y-%m-%d %H:%M') UTC."
  sleep $(( next - now )) & wait $!
  /backup/backup.sh || true # a failure is recorded; keep the schedule going
done
