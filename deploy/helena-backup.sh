#!/bin/bash
# Ежедневный бэкап базы Helena Fit (pg_dump из контейнера), хранение 14 дней.
set -euo pipefail

BACKUP_DIR=/var/www/helena-fit/backups
mkdir -p "$BACKUP_DIR"

STAMP=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/helena_fit_${STAMP}.sql.gz"

# Дамп всей базы и сжатие
docker exec helena-fit-db pg_dump -U postgres helena_fit | gzip > "$FILE"

# Чистим копии старше 14 дней
find "$BACKUP_DIR" -name 'helena_fit_*.sql.gz' -mtime +14 -delete

SIZE=$(du -h "$FILE" | cut -f1)
echo "$(date '+%Y-%m-%d %H:%M:%S') OK -> $FILE ($SIZE)" >> "$BACKUP_DIR/backup.log"
