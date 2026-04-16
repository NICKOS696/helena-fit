# 🚀 Деплой Helena Fit на сервер

## 📋 Информация о сервере

- **IP:** 85.239.63.189
- **SSH:** `ssh root@85.239.63.189`
- **Пароль:** zMxN-DD1LzrcrJ
- **Установлено:** Docker, Apache

---

## 🔧 Шаг 1: Подготовка сервера

### 1.1 Подключитесь к серверу:
```bash
ssh root@85.239.63.189
```

### 1.2 Обновите систему:
```bash
apt update && apt upgrade -y
```

### 1.3 Установите необходимые пакеты:
```bash
apt install -y git docker-compose nginx certbot python3-certbot-nginx
```

### 1.4 Проверьте Docker:
```bash
docker --version
docker-compose --version
```

---

## 📦 Шаг 2: Загрузка проекта на сервер

### 2.1 Создайте директорию для проекта:
```bash
mkdir -p /var/www/helena-fit
cd /var/www/helena-fit
```

### 2.2 Вариант A: Загрузка через Git (рекомендуется)
```bash
# Если у вас есть Git репозиторий
git clone <your-repo-url> .
```

### 2.2 Вариант B: Загрузка через SCP (с вашего компьютера)
```bash
# На вашем компьютере (Windows PowerShell):
cd "C:\Users\Николай Филиппов\CascadeProjects\Helena Fit"

# Создайте архив (исключая node_modules)
tar -czf helena-fit.tar.gz --exclude=node_modules --exclude=.git --exclude=dist backend telegram-app admin-panel docker-compose.yml .env.production

# Загрузите на сервер
scp helena-fit.tar.gz root@85.239.63.189:/var/www/helena-fit/

# На сервере распакуйте
cd /var/www/helena-fit
tar -xzf helena-fit.tar.gz
rm helena-fit.tar.gz
```

---

## ⚙️ Шаг 3: Настройка окружения

### 3.1 Скопируйте и отредактируйте .env файл:
```bash
cd /var/www/helena-fit
cp .env.production .env
nano .env
```

### 3.2 Обязательно измените:
```env
# Придумайте сложный пароль для БД
DB_PASSWORD=your_very_secure_password_123

# Придумайте длинный случайный JWT секрет
JWT_SECRET=your-super-long-random-jwt-secret-key-here-make-it-very-long

# Укажите ваш домен (или IP если домена нет)
TELEGRAM_APP_URL=https://85.239.63.189
ADMIN_PANEL_URL=https://85.239.63.189/admin
PAYME_CALLBACK_URL=https://85.239.63.189/api/payme/callback
```

---

## 🐳 Шаг 4: Запуск Docker контейнеров

### 4.1 Запустите контейнеры:
```bash
cd /var/www/helena-fit
docker-compose up -d
```

### 4.2 Проверьте статус:
```bash
docker-compose ps
docker-compose logs -f backend
```

### 4.3 Проверьте что backend работает:
```bash
curl http://localhost:3000/api
```

---

## 🌐 Шаг 5: Настройка Nginx (Reverse Proxy)

### 5.1 Создайте конфигурацию Nginx:
```bash
nano /etc/nginx/sites-available/helena-fit
```

### 5.2 Вставьте конфигурацию:
```nginx
server {
    listen 80;
    server_name 85.239.63.189;

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:3000;
    }

    # Telegram App (будет позже)
    location / {
        root /var/www/helena-fit/telegram-app/dist;
        try_files $uri $uri/ /index.html;
    }

    # Admin Panel (будет позже)
    location /admin {
        alias /var/www/helena-fit/admin-panel/dist;
        try_files $uri $uri/ /admin/index.html;
    }
}
```

### 5.3 Активируйте конфигурацию:
```bash
ln -s /etc/nginx/sites-available/helena-fit /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 📱 Шаг 6: Сборка и деплой Frontend

### 6.1 На вашем компьютере соберите Telegram App:
```bash
cd telegram-app
npm run build
```

### 6.2 Загрузите на сервер:
```bash
scp -r dist root@85.239.63.189:/var/www/helena-fit/telegram-app/
```

### 6.3 То же для Admin Panel:
```bash
cd admin-panel
npm run build
scp -r dist root@85.239.63.189:/var/www/helena-fit/admin-panel/
```

---

## 🤖 Шаг 7: Настройка Telegram Bot

### 7.1 Установите webhook для бота:
```bash
curl -X POST "https://api.telegram.org/bot8676161809:AAEUArS36PzRCE3-7v45lUCPG-sgzCuB5b0/setWebhook?url=https://85.239.63.189/api/telegram/webhook"
```

### 7.2 Настройте Mini App в BotFather:
1. Откройте @BotFather в Telegram
2. Отправьте `/mybots`
3. Выберите вашего бота
4. Нажмите "Bot Settings" → "Menu Button"
5. Укажите URL: `https://85.239.63.189`

---

## 🔒 Шаг 8: SSL сертификат (опционально, но рекомендуется)

Если у вас есть домен:

```bash
certbot --nginx -d your-domain.com
```

Если нет домена - можно использовать IP, но Telegram может требовать HTTPS.

---

## 📊 Полезные команды

### Просмотр логов:
```bash
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Перезапуск контейнеров:
```bash
docker-compose restart
```

### Остановка:
```bash
docker-compose down
```

### Обновление после изменений:
```bash
docker-compose down
docker-compose up -d --build
```

### Миграции БД:
```bash
docker-compose exec backend npx prisma migrate deploy
```

---

## ✅ Проверка работоспособности

1. **Backend API:** http://85.239.63.189/api
2. **Telegram App:** http://85.239.63.189
3. **Admin Panel:** http://85.239.63.189/admin
4. **Database:** Внутри Docker сети

---

## 🆘 Troubleshooting

### Проблема: Backend не запускается
```bash
docker-compose logs backend
```

### Проблема: База данных не подключается
```bash
docker-compose exec backend npx prisma db push
```

### Проблема: Порт 3000 занят
```bash
netstat -tulpn | grep 3000
# Или измените порт в docker-compose.yml
```

---

## 🎯 Следующие шаги

1. ✅ Настроить домен (опционально)
2. ✅ Установить SSL сертификат
3. ✅ Настроить автоматические бэкапы БД
4. ✅ Настроить мониторинг
5. ✅ Заполнить контентом через Admin Panel

**Готово к запуску! 🚀**
