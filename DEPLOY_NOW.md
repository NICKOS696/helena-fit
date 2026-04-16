# 🚀 Деплой Helena Fit - ПОШАГОВАЯ ИНСТРУКЦИЯ

## ✅ Сервер проверен, готов к деплою!

**Важно:** Выполняйте команды по порядку, не пропускайте шаги!

---

## 📦 Шаг 1: Загрузка проекта на сервер

### 1.1 На вашем компьютере создайте GitHub репозиторий:

```bash
cd "C:\Users\Николай Филиппов\CascadeProjects\Helena Fit"

# Инициализация Git
git init
git add .
git commit -m "Initial commit: Helena Fit Bot"

# Создайте репозиторий на GitHub (https://github.com/new)
# Назовите его: helena-fit
# Тип: Private

# Подключите репозиторий (ЗАМЕНИТЕ на ваш URL!)
git remote add origin https://github.com/YOUR_USERNAME/helena-fit.git
git branch -M main
git push -u origin main
```

**Если Git спросит логин:**
- Username: ваш GitHub username
- Password: используйте Personal Access Token (не пароль!)
- Создать токен: GitHub → Settings → Developer settings → Tokens

---

## 🖥️ Шаг 2: Клонирование на сервер

### 2.1 На сервере (вы уже подключены):

```bash
# Установим Git если нужно
apt update
apt install -y git

# Перейдем в /var/www
cd /var/www

# Клонируем репозиторий (ЗАМЕНИТЕ на ваш URL!)
git clone https://github.com/YOUR_USERNAME/helena-fit.git

# Если репозиторий приватный, Git спросит логин/токен
# Username: ваш GitHub username
# Password: ваш Personal Access Token

# Перейдем в папку проекта
cd helena-fit
ls -la
```

**Должны увидеть:** backend, telegram-app, admin-panel, docker-compose.yml

---

## ⚙️ Шаг 3: Настройка окружения

### 3.1 Создайте .env файл:

```bash
cd /var/www/helena-fit
nano .env
```

### 3.2 Вставьте эту конфигурацию:

```env
# Database
DB_PASSWORD=HelenaFit2026SecurePassword

# JWT
JWT_SECRET=super-long-random-jwt-secret-key-helena-fit-2026-change-this

# Telegram Bot
TELEGRAM_BOT_TOKEN=8676161809:AAEUArS36PzRCE3-7v45lUCPG-sgzCuB5b0

# URLs
TELEGRAM_APP_URL=http://85.239.63.189
ADMIN_PANEL_URL=http://85.239.63.189/admin

# Payme
PAYME_MERCHANT_ID=68c7b7859ac2828cbcccc4ed
PAYME_TEST_KEY=q%#9mdaAId9tsNVR9Nfe27PdP@Rqys62DK76
PAYME_PROD_KEY=m1k%&o0dXhJabWM@5?kz7aS3TIs7y#%nXJ#q
PAYME_ENDPOINT=https://checkout.paycom.uz
PAYME_CALLBACK_URL=http://85.239.63.189/api/payme/callback
```

### 3.3 Сохраните файл:
- Нажмите `Ctrl+X`
- Нажмите `Y`
- Нажмите `Enter`

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
```

**Должны увидеть:**
- helena-fit-db (running)
- helena-fit-backend (running)

### 4.3 Посмотрите логи backend:

```bash
docker-compose logs -f backend
```

**Ждите сообщение:** `🚀 Server is running on: http://localhost:3000`

Нажмите `Ctrl+C` чтобы выйти из логов.

### 4.4 Проверьте что backend работает:

```bash
curl http://localhost:3000/api
```

**Должны увидеть:** JSON ответ или "Cannot GET /api"

---

## 🌐 Шаг 5: Настройка Nginx

### 5.1 Создайте конфигурацию Nginx:

```bash
nano /etc/nginx/sites-available/helena-fit
```

### 5.2 Вставьте эту конфигурацию:

```nginx
server {
    listen 80;
    server_name 85.239.63.189;

    # Увеличиваем размер загружаемых файлов
    client_max_body_size 10M;

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

    # Telegram App (временно заглушка)
    location / {
        root /var/www/helena-fit/telegram-app/dist;
        try_files $uri $uri/ /index.html;
    }

    # Admin Panel (временно заглушка)
    location /admin {
        alias /var/www/helena-fit/admin-panel/dist;
        try_files $uri $uri/ /admin/index.html;
    }
}
```

### 5.3 Сохраните (Ctrl+X, Y, Enter)

### 5.4 Активируйте конфигурацию:

```bash
# Создаем символическую ссылку
ln -s /etc/nginx/sites-available/helena-fit /etc/nginx/sites-enabled/

# Проверяем конфигурацию
nginx -t

# Перезагружаем Nginx
systemctl reload nginx
```

**Должны увидеть:** `nginx: configuration file ... test is successful`

---

## 🧪 Шаг 6: Проверка API

### 6.1 Проверьте API через внешний IP:

```bash
curl http://85.239.63.189/api
```

**Должны увидеть:** JSON ответ

### 6.2 На вашем компьютере откройте браузер:

```
http://85.239.63.189/api
```

**Должны увидеть:** JSON ответ в браузере

✅ **Если видите - Backend работает!**

---

## 📱 Шаг 7: Сборка и загрузка Frontend

### 7.1 На вашем компьютере соберите Telegram App:

```bash
cd "C:\Users\Николай Филиппов\CascadeProjects\Helena Fit\telegram-app"

# Обновите .env с правильным API URL
echo VITE_API_URL=http://85.239.63.189/api > .env

# Соберите
npm run build
```

### 7.2 Соберите Admin Panel:

```bash
cd "..\admin-panel"

# Обновите .env
echo VITE_API_URL=http://85.239.63.189/api > .env

# Соберите
npm run build
```

### 7.3 Загрузите на сервер:

```bash
# Из корня проекта
cd "C:\Users\Николай Филиппов\CascadeProjects\Helena Fit"

# Загрузите Telegram App
scp -r telegram-app\dist root@85.239.63.189:/var/www/helena-fit/telegram-app/

# Загрузите Admin Panel
scp -r admin-panel\dist root@85.239.63.189:/var/www/helena-fit/admin-panel/
```

### 7.4 Проверьте в браузере:

```
http://85.239.63.189
```

✅ **Должны увидеть Telegram App!**

---

## 🤖 Шаг 8: Настройка Telegram бота

### 8.1 Откройте @BotFather в Telegram

### 8.2 Настройте Menu Button:

```
/mybots
→ Выберите вашего бота
→ Bot Settings
→ Menu Button
→ Configure menu button
→ Введите URL: http://85.239.63.189
→ Готово!
```

### 8.3 Откройте вашего бота и нажмите кнопку меню!

✅ **Должно открыться приложение!**

---

## 🎉 ГОТОВО!

### ✅ Что работает:
- ✅ Backend API на http://85.239.63.189/api
- ✅ Telegram App на http://85.239.63.189
- ✅ Admin Panel на http://85.239.63.189/admin
- ✅ База данных PostgreSQL
- ✅ Payme интеграция
- ✅ Telegram бот

### 📊 Полезные команды:

```bash
# Посмотреть логи
docker-compose logs -f backend

# Перезапустить backend
docker-compose restart backend

# Остановить все
docker-compose down

# Запустить снова
docker-compose up -d
```

---

## 🔄 Обновление в будущем:

### На компьютере:
```bash
git add .
git commit -m "Описание изменений"
git push
```

### На сервере:
```bash
cd /var/www/helena-fit
git pull
docker-compose restart backend
```

---

## 🆘 Если что-то не работает:

1. Проверьте логи: `docker-compose logs backend`
2. Проверьте Nginx: `nginx -t`
3. Проверьте порты: `ss -tulpn | grep 3000`
4. Напишите мне - помогу!

**Удачи! 🚀**
