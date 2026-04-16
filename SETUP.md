# Инструкция по установке и запуску Helena Fit

## Требования

- Node.js 18+ и npm
- PostgreSQL 14+
- Git

## 1. Установка зависимостей

### Backend

```bash
cd backend
npm install
```

### Telegram Mini App

```bash
cd telegram-app
npm install
```

### Admin Panel

```bash
cd admin-panel
npm install
```

## 2. Настройка базы данных

### Создайте базу данных PostgreSQL

```sql
CREATE DATABASE helena_fit;
```

### Настройте переменные окружения

Скопируйте файл `.env.example` в `.env` в папке `backend`:

```bash
cd backend
cp .env.example .env
```

Отредактируйте `.env` и укажите правильные данные для подключения к БД:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/helena_fit?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
```

### Выполните миграции и seed

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

Это создаст все необходимые таблицы и добавит тестовые данные, включая:
- Админ-пользователя (логин: `admin`, пароль: `admin123`)
- Примеры сборников тренировок и рецептов
- Тестовые новости

## 3. Настройка Frontend приложений

### Telegram Mini App

```bash
cd telegram-app
cp .env.example .env
```

Отредактируйте `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

### Admin Panel

```bash
cd admin-panel
cp .env.example .env
```

Отредактируйте `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

## 4. Запуск приложений

### Запуск Backend

```bash
cd backend
npm run start:dev
```

Backend будет доступен на `http://localhost:3000`

### Запуск Telegram Mini App

```bash
cd telegram-app
npm run dev
```

Приложение будет доступно на `http://localhost:5173`

### Запуск Admin Panel

```bash
cd admin-panel
npm run dev
```

Админ-панель будет доступна на `http://localhost:5174`

## 5. Настройка Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен бота и добавьте его в `.env` файл backend
3. Настройте Web App URL в настройках бота:
   - Для разработки: `https://your-ngrok-url.ngrok.io` (используйте ngrok для локальной разработки)
   - Для продакшена: ваш реальный домен

### Использование ngrok для локальной разработки

```bash
ngrok http 5173
```

Скопируйте HTTPS URL и используйте его как Web App URL в настройках бота.

## 6. Доступ к админ-панели

Откройте `http://localhost:5174` в браузере и войдите с учетными данными:

- **Логин**: `admin`
- **Пароль**: `admin123`

## 7. Дополнительные команды

### Prisma Studio (GUI для БД)

```bash
cd backend
npx prisma studio
```

Откроется на `http://localhost:5555`

### Сборка для продакшена

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Telegram App
cd telegram-app
npm run build

# Admin Panel
cd admin-panel
npm run build
```

## Структура проекта

```
helena-fit/
├── backend/              # NestJS API
│   ├── prisma/          # Схема БД и миграции
│   ├── src/             # Исходный код
│   └── uploads/         # Загруженные файлы
├── telegram-app/        # Telegram Mini App
│   └── src/             # React компоненты
└── admin-panel/         # Веб-панель администратора
    └── src/             # React компоненты
```

## Troubleshooting

### Ошибка подключения к БД

Убедитесь, что PostgreSQL запущен и данные в `DATABASE_URL` корректны.

### Ошибка CORS

Проверьте, что в `backend/src/main.ts` указаны правильные URL для CORS.

### Ошибка авторизации в Telegram

Убедитесь, что:
1. Telegram Bot Token указан правильно
2. Web App URL настроен в BotFather
3. Используется HTTPS (для продакшена или ngrok для разработки)

## Следующие шаги

1. Добавьте реальные данные через админ-панель
2. Настройте интеграцию с Payme для приема платежей
3. Загрузите изображения и видео для контента
4. Настройте production окружение и деплой
