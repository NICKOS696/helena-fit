#!/bin/bash
# Админка (:8080) проксировала /uploads в backend, который отвечает 404
# (том в контейнере смонтирован не туда). Отдаём файлы напрямую с диска,
# как в основном 443-блоке.
set -e
for f in /etc/nginx/sites-available/helena-rf /etc/nginx/sites-available/helena-fit; do
  [ -f "$f" ] || continue
  perl -0777 -pi -e 's|location /uploads \{\s*proxy_pass http://localhost:3000;\s*\}|location /uploads/ {\n        alias /var/www/helena-fit/backend/uploads/;\n        expires 30d;\n        add_header Cache-Control "public, immutable";\n    }|s' "$f"
done
nginx -t && systemctl reload nginx
echo UPLOADS_FIXED
