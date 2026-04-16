# Руководство по деплою Helena Fit

## Деплой Backend (NestJS)

### Рекомендуемые платформы

1. **Railway** (рекомендуется для начала)
2. **Render**
3. **DigitalOcean App Platform**
4. **VPS (Ubuntu)** - для полного контроля

### Деплой на Railway

1. Создайте аккаунт на [Railway.app](https://railway.app)
2. Создайте новый проект
3. Добавьте PostgreSQL сервис
4. Добавьте Backend сервис из GitHub репозитория
5. Настройте переменные окружения:
   ```
   DATABASE_URL=<автоматически из PostgreSQL>
   JWT_SECRET=<ваш секретный ключ>
   TELEGRAM_BOT_TOKEN=<токен бота>
   PORT=3000
   NODE_ENV=production
   TELEGRAM_APP_URL=<URL вашего Telegram App>
   ADMIN_PANEL_URL=<URL вашей админ-панели>
   ```
6. Railway автоматически запустит миграции и деплой

### Деплой на VPS (Ubuntu)

```bash
# Установите Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установите PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Установите PM2
sudo npm install -g pm2

# Клонируйте репозиторий
git clone <your-repo-url>
cd helena-fit/backend

# Установите зависимости
npm install

# Настройте .env
nano .env

# Выполните миграции
npx prisma migrate deploy
npx prisma db seed

# Соберите проект
npm run build

# Запустите с PM2
pm2 start dist/main.js --name helena-fit-backend
pm2 save
pm2 startup
```

### Настройка Nginx (для VPS)

```nginx
server {
    listen 80;
    server_name api.helenafit.uz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Деплой Telegram Mini App

### Рекомендуемые платформы

1. **Vercel** (рекомендуется)
2. **Netlify**
3. **GitHub Pages**

### Деплой на Vercel

1. Установите Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Перейдите в папку telegram-app:
   ```bash
   cd telegram-app
   ```

3. Создайте `.env.production`:
   ```env
   VITE_API_URL=https://api.helenafit.uz/api
   ```

4. Деплой:
   ```bash
   vercel --prod
   ```

5. Настройте домен в Vercel Dashboard

### Деплой на Netlify

1. Соберите проект:
   ```bash
   cd telegram-app
   npm run build
   ```

2. Установите Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

3. Деплой:
   ```bash
   netlify deploy --prod --dir=dist
   ```

## Деплой Admin Panel

### Деплой на Vercel

Аналогично Telegram Mini App:

```bash
cd admin-panel
vercel --prod
```

## Настройка Telegram Bot

1. Откройте [@BotFather](https://t.me/BotFather)
2. Используйте команду `/setmenubutton`
3. Выберите вашего бота
4. Введите URL вашего Telegram Mini App (например: `https://helena-fit.vercel.app`)
5. Используйте `/mybots` → выберите бота → Bot Settings → Menu Button → Edit menu button URL

## SSL/HTTPS

Telegram требует HTTPS для Web Apps. Все рекомендуемые платформы (Vercel, Netlify, Railway) автоматически предоставляют SSL.

Для VPS используйте Let's Encrypt:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.helenafit.uz
```

## Переменные окружения для продакшена

### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@host:5432/helena_fit
JWT_SECRET=<сгенерируйте длинный случайный ключ>
JWT_EXPIRES_IN=7d
TELEGRAM_BOT_TOKEN=<ваш токен>
PORT=3000
NODE_ENV=production
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
TELEGRAM_APP_URL=https://helena-fit.vercel.app
ADMIN_PANEL_URL=https://admin.helenafit.uz
```

### Telegram App (.env.production)

```env
VITE_API_URL=https://api.helenafit.uz/api
```

### Admin Panel (.env.production)

```env
VITE_API_URL=https://api.helenafit.uz/api
```

## Мониторинг и логи

### PM2 (для VPS)

```bash
# Просмотр логов
pm2 logs helena-fit-backend

# Мониторинг
pm2 monit

# Перезапуск
pm2 restart helena-fit-backend
```

### Railway/Render

Используйте встроенные инструменты мониторинга в Dashboard.

## Backup базы данных

### Автоматический backup (для VPS)

Создайте cron job:

```bash
crontab -e
```

Добавьте:

```cron
0 2 * * * pg_dump helena_fit > /backups/helena_fit_$(date +\%Y\%m\%d).sql
```

### Railway/Render

Используйте встроенные инструменты backup или настройте автоматический экспорт в S3.

## Масштабирование

### Horizontal Scaling

- Используйте load balancer (Nginx, Cloudflare)
- Запустите несколько инстансов backend
- Используйте Redis для session storage

### Database Optimization

- Настройте connection pooling в Prisma
- Добавьте индексы для часто запрашиваемых полей
- Используйте read replicas для чтения

## Безопасность

1. **Никогда не коммитьте .env файлы**
2. **Используйте сильные пароли для БД**
3. **Регулярно обновляйте зависимости**: `npm audit fix`
4. **Настройте rate limiting** в backend
5. **Используйте HTTPS везде**
6. **Регулярно делайте backup БД**

## Checklist перед продакшеном

- [ ] Все переменные окружения настроены
- [ ] SSL сертификаты установлены
- [ ] База данных защищена
- [ ] Backup настроен
- [ ] Мониторинг настроен
- [ ] Telegram Bot настроен с правильным URL
- [ ] CORS настроен правильно
- [ ] Логирование работает
- [ ] Тестовые данные удалены
- [ ] Админ пароль изменен
