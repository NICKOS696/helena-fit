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
    netstat -tulpn | grep apache2 || ss -tulpn | grep apache2
    echo "✅ Apache установлен и работает"
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
netstat -tulpn | grep :80 || ss -tulpn | grep :80 || echo "Порт 80 свободен"
echo ""
echo "Порт 443:"
netstat -tulpn | grep :443 || ss -tulpn | grep :443 || echo "Порт 443 свободен"
echo ""
echo "Порт 3000:"
netstat -tulpn | grep :3000 || ss -tulpn | grep :3000 || echo "Порт 3000 свободен"
echo ""
echo "Порт 5432:"
netstat -tulpn | grep :5432 || ss -tulpn | grep :5432 || echo "Порт 5432 свободен"
echo ""

# Проверка запущенных Docker контейнеров
echo "🐳 Запущенные Docker контейнеры:"
docker ps -a 2>/dev/null || echo "Нет запущенных контейнеров или нет доступа"
echo ""

# Проверка места на диске
echo "💾 Место на диске:"
df -h / | tail -1
echo ""

# Проверка памяти
echo "🧠 Память:"
free -h | grep Mem
echo ""

# Проверка существующих веб-сайтов
echo "🌍 Существующие сайты Apache:"
if [ -d /etc/apache2/sites-enabled ]; then
    ls -la /etc/apache2/sites-enabled/
else
    echo "Директория не найдена"
fi
echo ""

# Проверка /var/www
echo "📁 Содержимое /var/www:"
ls -la /var/www/ 2>/dev/null || echo "Нет доступа к /var/www"
echo ""

echo "=========================================="
echo "✅ ПРОВЕРКА ЗАВЕРШЕНА"
echo "=========================================="
