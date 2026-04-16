# 🔍 Проверка сервера перед деплоем

## Шаг 1: Подключитесь к серверу

Откройте терминал (PowerShell или CMD) и выполните:

```bash
ssh root@85.239.63.189
```

Пароль: `zMxN-DD1LzrcrJ`

---

## Шаг 2: Скопируйте и запустите скрипт проверки

После подключения к серверу, выполните эти команды:

```bash
# Создайте скрипт
cat > check-server.sh << 'EOF'
#!/bin/bash

echo "=========================================="
echo "🔍 ПРОВЕРКА СЕРВЕРА Helena Fit"
echo "=========================================="
echo ""

# Информация о системе
echo "📋 Информация о системе:"
uname -a
echo ""
cat /etc/os-release | grep PRETTY_NAME
echo ""

# Проверка Docker
echo "🐳 Проверка Docker:"
if command -v docker &> /dev/null; then
    docker --version
    echo "✅ Docker установлен"
else
    echo "❌ Docker НЕ установлен"
fi
echo ""

# Проверка Docker Compose
echo "🐳 Проверка Docker Compose:"
if command -v docker-compose &> /dev/null; then
    docker-compose --version
    echo "✅ Docker Compose установлен"
else
    echo "❌ Docker Compose НЕ установлен"
fi
echo ""

# Проверка Apache
echo "🌐 Проверка Apache:"
if command -v apache2 &> /dev/null; then
    apache2 -v | head -1
    systemctl is-active apache2
    echo "Порты Apache:"
    ss -tulpn | grep apache2 || netstat -tulpn | grep apache2
    echo "✅ Apache установлен"
else
    echo "❌ Apache НЕ установлен"
fi
echo ""

# Проверка Nginx
echo "🌐 Проверка Nginx:"
if command -v nginx &> /dev/null; then
    nginx -v 2>&1
    systemctl is-active nginx 2>&1 || echo "Nginx не запущен"
    echo "✅ Nginx установлен"
else
    echo "❌ Nginx НЕ установлен"
fi
echo ""

# Проверка занятых портов
echo "🔌 Занятые порты:"
echo "Порт 80:"
ss -tulpn | grep :80 || echo "Порт 80 свободен"
echo ""
echo "Порт 443:"
ss -tulpn | grep :443 || echo "Порт 443 свободен"
echo ""
echo "Порт 3000:"
ss -tulpn | grep :3000 || echo "Порт 3000 свободен"
echo ""
echo "Порт 5432:"
ss -tulpn | grep :5432 || echo "Порт 5432 свободен"
echo ""

# Проверка Docker контейнеров
echo "🐳 Запущенные Docker контейнеры:"
docker ps -a 2>/dev/null || echo "Нет контейнеров"
echo ""

# Проверка места на диске
echo "💾 Место на диске:"
df -h / | tail -1
echo ""

# Проверка памяти
echo "🧠 Память:"
free -h | grep Mem
echo ""

# Проверка сайтов Apache
echo "🌍 Сайты Apache:"
if [ -d /etc/apache2/sites-enabled ]; then
    ls -la /etc/apache2/sites-enabled/
fi
echo ""

# Проверка /var/www
echo "📁 Содержимое /var/www:"
ls -la /var/www/ 2>/dev/null || echo "Пусто"
echo ""

echo "=========================================="
echo "✅ ПРОВЕРКА ЗАВЕРШЕНА"
echo "=========================================="
EOF

# Сделайте скрипт исполняемым
chmod +x check-server.sh

# Запустите скрипт
./check-server.sh
```

---

## Шаг 3: Скопируйте результат и пришлите мне

После выполнения скрипта:
1. Скопируйте весь вывод
2. Пришлите мне
3. Я проанализирую и скажу что нужно сделать

---

## Альтернатива: Ручная проверка

Если скрипт не работает, выполните команды по отдельности:

```bash
# Проверка Docker
docker --version
docker ps -a

# Проверка Apache
apache2 -v
systemctl status apache2

# Проверка портов
ss -tulpn | grep -E ':(80|443|3000|5432)'

# Проверка места
df -h
free -h

# Проверка сайтов
ls -la /var/www/
ls -la /etc/apache2/sites-enabled/
```

Пришлите результаты! 📊
