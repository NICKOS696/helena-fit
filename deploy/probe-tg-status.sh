#!/bin/bash
# Тихая проверка доступности бота для всех пользователей.
# sendChatAction не отправляет сообщений: 403 = заблокировал бота,
# 400 chat not found/deactivated = удалил аккаунт (или ни разу не запускал бота).
# Результат пишется в users.tgStatus / tgStatusAt.
set -u
cd /var/www/helena-fit
TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' .env | cut -d= -f2 | tr -d '\r')
[ -z "$TOKEN" ] && { echo "NO TOKEN"; exit 1; }

TMP=/root/tg-probe
rm -rf $TMP && mkdir -p $TMP

docker exec helena-fit-db psql -U postgres -d helena_fit -t -A \
  -c "SELECT \"telegramId\" FROM users WHERE \"telegramId\" <> ''" > $TMP/ids.txt

total=0; ok=0; blocked=0; deleted=0; other=0
while read -r id; do
  [ -z "$id" ] && continue
  total=$((total+1))
  resp=$(curl -6 -s --connect-timeout 10 --max-time 20 \
    "https://api.telegram.org/bot$TOKEN/sendChatAction" \
    -d chat_id="$id" -d action=typing)
  if echo "$resp" | grep -q '"ok":true'; then
    ok=$((ok+1)); echo "$id" >> $TMP/ok.txt
  elif echo "$resp" | grep -q '"error_code":403'; then
    blocked=$((blocked+1)); echo "$id" >> $TMP/blocked.txt
  elif echo "$resp" | grep -qiE 'chat not found|deactivated'; then
    deleted=$((deleted+1)); echo "$id" >> $TMP/deleted.txt
  elif echo "$resp" | grep -q '"error_code":429'; then
    wait=$(echo "$resp" | grep -o '"retry_after":[0-9]*' | grep -o '[0-9]*')
    sleep "${wait:-3}"
    resp=$(curl -6 -s --max-time 20 \
      "https://api.telegram.org/bot$TOKEN/sendChatAction" \
      -d chat_id="$id" -d action=typing)
    if echo "$resp" | grep -q '"ok":true'; then
      ok=$((ok+1)); echo "$id" >> $TMP/ok.txt
    else
      other=$((other+1)); echo "$id $resp" >> $TMP/other.txt
    fi
  else
    other=$((other+1)); echo "$id $resp" >> $TMP/other.txt
  fi
  sleep 0.05
done < $TMP/ids.txt

update_status() {
  local file=$1 st=$2
  [ -s "$file" ] || return 0
  local ids
  ids=$(paste -sd, "$file" | sed "s/[0-9-]*/'&'/g")
  docker exec helena-fit-db psql -U postgres -d helena_fit \
    -c "UPDATE users SET \"tgStatus\"='$st', \"tgStatusAt\"=now() WHERE \"telegramId\" IN ($ids) AND \"tgStatus\" <> '$st';"
}
update_status $TMP/blocked.txt BLOCKED
update_status $TMP/deleted.txt DELETED
update_status $TMP/ok.txt OK

echo "PROBE_DONE total=$total ok=$ok blocked=$blocked deleted=$deleted other=$other"
