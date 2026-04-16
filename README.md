# Helena Fit - Фитнес/Wellness Платформа

Telegram Mini App + Веб-панель администратора для продажи курсов тренировок и сборников рецептов.

## 📁 Структура проекта

```
/
├── telegram-app/        # Telegram Mini App (React + Vite + TypeScript)
├── admin-panel/         # Веб-панель администратора (React + Vite + TypeScript)
└── backend/             # Backend API (NestJS + PostgreSQL + Prisma)
```

## 🚀 Быстрый старт

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Настройте переменные окружения в .env
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

### Telegram Mini App

```bash
cd telegram-app
npm install
npm run dev
```

### Admin Panel

```bash
cd admin-panel
npm install
npm run dev
```

## 🎨 Дизайн-система

### Цветовая палитра

- **Primary**: `#4DC8D4` → `#45B5C4` (градиент)
- **Background карточек**: `#FFFFFF`
- **Background страницы**: `#F5F5F5`
- **Иконки/активный таб**: `#45B5C4`
- **Текст основной**: `#333333`
- **Текст вторичный**: `#888888`

### UI-элементы

- **Карточки**: `border-radius: 16px`, белый фон, мягкая тень
- **Шрифт**: системный sans-serif (SF Pro / Roboto)
- **Иконки**: линейный стиль (outline)

## 🛠 Технологический стек

### Frontend (Telegram App & Admin)
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- React Query (data fetching)

### Telegram SDK
- @tma.js/sdk

### Admin UI
- shadcn/ui
- Lucide Icons

### Backend
- NestJS
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Passport

## 📱 Функционал Telegram Mini App

### Навигация (4 таба)
1. **🏠 Главная** - лента новостей и акций
2. **💪 Тренировки** - сборники тренировок с видео
3. **🥗 Рецепты** - сборники рецептов с КБЖУ
4. **👤 Профиль** - личный кабинет и покупки

## 🖥 Функционал Админ-панели

1. **Управление пользователями** - добавление, редактирование доступа
2. **Управление тренировками** - CRUD сборников и тренировок
3. **Управление рецептами** - CRUD сборников и рецептов
4. **Новости и акции** - публикация контента
5. **Управление ценами** - настройка цен и скидок

## 🔐 Авторизация

- **Telegram App**: через Telegram initData (без логина/пароля)
- **Admin Panel**: JWT токены

## 💳 Оплата

✅ **Интеграция Payme Uzbekistan**
- Оплата сборников тренировок и рецептов
- Автоматическая выдача доступа после оплаты
- Webhook для подтверждения платежей

## 🚀 Деплой

### Через Docker (рекомендуется)
```bash
# Клонируйте репозиторий
git clone <your-repo-url>
cd helena-fit

# Создайте .env файл
cp .env.example .env
# Отредактируйте .env

# Запустите Docker
docker-compose up -d
```

### Подробные инструкции
- 📖 [DEPLOY.md](./DEPLOY.md) - Полная инструкция по деплою
- 📖 [GITHUB_DEPLOY.md](./GITHUB_DEPLOY.md) - Деплой через GitHub
- 📖 [SERVER_CHECK.md](./SERVER_CHECK.md) - Проверка сервера перед деплоем
- 📖 [PAYME_SETUP.md](./PAYME_SETUP.md) - Настройка Payme

## 📄 Лицензия

Proprietary
