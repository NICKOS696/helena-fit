#!/bin/bash
# Идемпотентная оптимизация загруженных изображений Helena Fit.
# Каждый файл обрабатывается РОВНО один раз (учёт в STATE), поэтому повторных
# перекомпрессий и деградации качества не происходит. Новые файлы подхватываются
# на следующем запуске cron.
set -u

UPLOADS=/var/www/helena-fit/backend/uploads
STATE_DIR=/var/lib/helena-img-optimize
STATE="$STATE_DIR/optimized.list"
LOCK="$STATE_DIR/lock"

MAX_DIM=1600        # длинная сторона
JPEG_QUALITY=85

mkdir -p "$STATE_DIR"
touch "$STATE"

# Только один экземпляр одновременно.
exec 9>"$LOCK"
flock -n 9 || exit 0

cd "$UPLOADS" 2>/dev/null || exit 0

# Изображения старше 2 минут (чтобы не зацепить недозагруженный файл),
# которых ещё нет в списке обработанных.
find . -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -mmin +2 -printf '%f\n' 2>/dev/null | while read -r name; do
  grep -qxF "$name" "$STATE" && continue

  case "$name" in
    *.png|*.PNG)
      mogrify -auto-orient -resize "${MAX_DIM}x${MAX_DIM}>" -strip -- "$name" 2>/dev/null
      pngquant --quality=65-88 --ext .png --force --skip-if-larger -- "$name" 2>/dev/null
      ;;
    *)
      mogrify -auto-orient -resize "${MAX_DIM}x${MAX_DIM}>" -quality "$JPEG_QUALITY" -strip -- "$name" 2>/dev/null
      ;;
  esac

  # Отмечаем как обработанный независимо от результата (один проход на файл).
  echo "$name" >> "$STATE"
done
