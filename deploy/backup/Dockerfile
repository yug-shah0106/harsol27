# Database backups. pg_dump/pg_restore match the database's major version (18); curl signs the
# optional off-site copy for S3-compatible storage (Cloudflare R2 or AWS S3).
FROM postgres:18.6-alpine
RUN apk add --no-cache curl
COPY backup.sh restore.sh run.sh /backup/
RUN chmod 0755 /backup/*.sh
ENTRYPOINT ["/backup/run.sh"]
