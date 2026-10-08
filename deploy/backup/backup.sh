#!/bin/sh
# One backup: dump the database, restore it into a scratch database to prove it works, copy it
# off-site (if configured), delete local copies older than BACKUP_KEEP_DAYS, and record the result
# in "BackupRun" (read by /api/health/full and the team's daily check). Connection: PG* variables.
set -eu
started=$(date -u '+%Y-%m-%d %H:%M:%S')
name="harsol27-$(date -u +%Y%m%dT%H%M%SZ).dump"
file="/backups/$name"
check_db="${PGDATABASE}_restore_check"
size=NULL; offsite=false; restored=false

record() { # $1 = true|false, $2 = error message (may be empty)
  printf '%s\n' "INSERT INTO \"BackupRun\" (id, \"startedAt\", \"finishedAt\", ok, \"fileName\", \"sizeBytes\", offsite, \"restoreChecked\", error)
    VALUES (gen_random_uuid(), '$started', timezone('UTC', now()), $1, '$name', $size, $offsite, $restored, NULLIF(:'error', ''));" |
    psql -X -q -v ON_ERROR_STOP=1 -v error="$2" >/dev/null
}
fail() { echo "BACKUP FAILED: $1" >&2; record false "$1" || echo "…and the result could not be recorded" >&2; exit 1; }
last_line() { printf '%s' "$1" | tail -n 1 | cut -c1-300; }

echo "Backing up to $name"
out=$(pg_dump --format=custom --no-owner --no-privileges --file "$file.partial" 2>&1) || fail "pg_dump: $(last_line "$out")"
mv "$file.partial" "$file"
size=$(stat -c %s "$file")

# Prove the file restores: into a scratch database, compared with the live one, then dropped.
dropdb --if-exists "$check_db" >/dev/null 2>&1 || true
out=$(createdb "$check_db" 2>&1) || fail "createdb: $(last_line "$out")"
if out=$(pg_restore --no-owner --no-privileges --exit-on-error -d "$check_db" "$file" 2>&1); then
  live=$(psql -X -At -c 'SELECT count(*) FROM "_prisma_migrations"')
  copy=$(psql -X -At -d "$check_db" -c 'SELECT count(*) FROM "_prisma_migrations"')
  tables=$(psql -X -At -d "$check_db" -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")
  [ "$live" = "$copy" ] && [ "$tables" -gt 10 ] && restored=true
fi
dropdb --if-exists "$check_db" >/dev/null 2>&1 || true
[ "$restored" = true ] || fail "test restore: $(last_line "${out:-restored data did not match}")"

# Off-site copy, only of a verified dump. Signed with AWS SigV4 (R2 and S3 both accept it).
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  url="${BACKUP_S3_ENDPOINT%/}/$BACKUP_S3_BUCKET/$name"
  out=$(curl --fail --silent --show-error --aws-sigv4 "aws:amz:${BACKUP_S3_REGION:-auto}:s3" \
    --user "$BACKUP_S3_ACCESS_KEY_ID:$BACKUP_S3_SECRET_ACCESS_KEY" -H "x-amz-content-sha256: UNSIGNED-PAYLOAD" \
    --upload-file "$file" "$url" 2>&1) || fail "off-site copy (the local copy is kept): $(last_line "$out")"
  offsite=true
fi

find /backups -name 'harsol27-*.dump' -type f -mtime "+${BACKUP_KEEP_DAYS:-14}" -delete
record true ""
echo "Backup OK: $name ($size bytes, test-restored$( [ "$offsite" = true ] && echo ', copied off-site'))"
