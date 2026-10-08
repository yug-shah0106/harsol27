#!/bin/sh
# Replaces the live database with a backup; the current one is kept under another name.
# Use deploy/restore.sh on the server: it stops the app and worker around this, which matters
# (anything written during the restore would otherwise go to the old database).
# A file not on this server is fetched from off-site storage, if configured.
set -eu
name="${1:?usage: restore.sh <backup file name> --yes   (ls /backups to see them)}"
case "$name" in harsol27-*.dump) ;; *) echo "Not a backup file name: $name" >&2; exit 2 ;; esac
if [ "${2:-}" != "--yes" ]; then
  echo "This replaces everything in the live database with $name. Re-run with --yes to go ahead." >&2
  exit 2
fi
file="/backups/$name"
if [ ! -f "$file" ] && [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  echo "Fetching $name from off-site storage…"
  curl --fail --silent --show-error --aws-sigv4 "aws:amz:${BACKUP_S3_REGION:-auto}:s3" \
    --user "$BACKUP_S3_ACCESS_KEY_ID:$BACKUP_S3_SECRET_ACCESS_KEY" -H "x-amz-content-sha256: UNSIGNED-PAYLOAD" \
    --output "$file.partial" "${BACKUP_S3_ENDPOINT%/}/$BACKUP_S3_BUCKET/$name"
  mv "$file.partial" "$file"
fi
[ -f "$file" ] || { echo "No such backup: $name" >&2; ls -1 /backups >&2; exit 1; }
# Restore into a new database first (the same path the nightly test-restore proves), and only swap
# it in once it is complete. The current database is kept under another name, so this can be undone.
new="${PGDATABASE}_restoring"
old="${PGDATABASE}_before_restore_$(date -u +%Y%m%dT%H%M%SZ)"
dropdb --if-exists "$new" 2>/dev/null || true
createdb "$new"
if ! pg_restore --no-owner --no-privileges --exit-on-error -d "$new" "$file"; then
  dropdb --if-exists "$new"
  echo "The restore failed; the live database was not touched." >&2
  exit 1
fi
if ! psql -X -q -d postgres -c "ALTER DATABASE \"$PGDATABASE\" RENAME TO \"$old\""; then
  dropdb --if-exists "$new"
  echo "The live database is still in use: stop the app and worker first (see deploy/README.md)." >&2
  exit 1
fi
psql -X -q -d postgres -c "ALTER DATABASE \"$new\" RENAME TO \"$PGDATABASE\""
echo "Restored $name. The previous database is kept as $old; once all is well: docker compose -f deploy/compose.yml exec backup dropdb $old"
