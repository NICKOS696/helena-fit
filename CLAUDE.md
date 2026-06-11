# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Обзор

Helena Fit — фитнес/wellness платформа для продажи курсов тренировок и сборников рецептов. Монорепозиторий из трёх приложений (npm workspaces):

- `telegram-app/` — Telegram Mini App для пользователей (React + Vite + TS, порт 5173)
- `admin-panel/` — веб-панель администратора (React + Vite + TS, порт 5174)
- `backend/` — REST API (NestJS + PostgreSQL + Prisma, порт 3000)

## Команды

Из корня (workspace-скрипты): `npm run dev:backend` | `dev:telegram` | `dev:admin`, `npm run build:all`, `npm run install:all`.

### Backend (`cd backend`)
- `npm run start:dev` — dev-сервер с watch
- `npm run build` / `npm run start:prod` — сборка и запуск из `dist/`
- `npm run lint` — ESLint с `--fix`; `npm run format` — Prettier
- `npm test` — Jest; один файл: `npm test -- recipes.service.spec`; `npm run test:watch`, `npm run test:e2e`, `npm run test:cov`
- `npm run prisma:migrate` (dev-миграция), `npm run prisma:generate`, `npm run prisma:seed`, `npm run prisma:studio`

### Frontend (telegram-app / admin-panel)
- `npm run dev`, `npm run build` (= `tsc && vite build`), `npm run preview`
- `npm run lint` — `eslint . --ext ts,tsx` с `--max-warnings 0` (любой warning ломает линт)

### Docker
`docker-compose up` поднимает Postgres (хост-порт **5434**) + backend; backend при старте выполняет `prisma migrate deploy`. Переменные берутся из корневого `.env` (шаблон — `.env.example`).

## Архитектура

### Двойная аутентификация через один JWT
Один `JwtService`/`JwtStrategy`, но **два типа субъектов**, различаемых полем `type` в payload:
- `type: 'user'` — Telegram-пользователь (`sub` = User.id, есть `telegramId`)
- `type: 'admin'` — администратор панели (`sub` = Admin.id, есть `role`)

`AdminGuard` (`auth/guards/admin.guard.ts`) пропускает только `type === 'admin'`. Эндпоинты используют три гварда: `JwtAuthGuard` (обязательная авторизация), `OptionalJwtAuthGuard` (`req.user` может быть null — так контент отдаётся гостям, но с учётом покупок у залогиненных), `AdminGuard`. В контроллерах `req.user.sub` и `req.user.id` встречаются вперемешку — учитывайте оба (см. `payme.controller.ts`).

Логин Telegram (`POST /api/auth/telegram`): `initData` парсится через `URLSearchParams`, берётся поле `user` — **подпись Telegram НЕ проверяется**. Есть dev-only `POST /api/auth/dev-login` (блокируется при `NODE_ENV=production`). Сид создаёт админа `admin` / `admin123`.

### Модель доступа (покупки)
Покупка сборника создаёт запись `WorkoutCollectionAccess` / `RecipeCollectionAccess` (уникальная пара user+collection). Именно наличие access-записи, а не транзакция, определяет доступ пользователя к контенту. Оплата идёт через **Payme** (узбекский шлюз): `POST /api/payme/create-payment` возвращает ссылку, вебхук Payme приходит на `POST /api/payme/callback` (без JWT, авторизуется заголовком от Payme). Модель `Transaction` хранит payme-специфичные поля (`paymeTransactionId`, `paymeCreateTime` и т.д.).

### Backend-модули
Каждая фича — отдельный NestJS-модуль в `backend/src/<feature>/` (паттерн controller + service + module): `auth`, `users`, `workouts`, `recipes`, `news`, `admin`, `upload`, `payme`, `analytics`. `PrismaModule` глобальный. Все маршруты под префиксом `/api` (`setGlobalPrefix`). CORS разрешён только для `TELEGRAM_APP_URL` и `ADMIN_PANEL_URL`. Загруженные файлы раздаются статикой из `backend/uploads/` по `/uploads/`.

### Контент-иерархия (Prisma)
- Тренировки: `WorkoutCollection` → либо плоские `Workout`, либо `WorkoutSection` → `WorkoutSectionItem` (тип секции `VIDEO` или `TEXT_FOLDER`). Видео — ссылки Rutube.
- Рецепты: `RecipeCollection` → `Recipe` (категории `BREAKFAST/MAIN_COURSE/SNACK/SALAD`, КБЖУ на 100г и на порцию, `ingredients` — JSON). Есть `FavoriteRecipe`.
- `News` со связями на сборники (`NewsWorkoutLink` / `NewsRecipeLink`).
- `ContentView` — аналитика просмотров.
- Флаги сборника: `isActive`, `isInDevelopment`, `order` (ручная сортировка, в админке через `@dnd-kit`).

### Frontend
Оба фронта: React 18 + Vite + Tailwind + Zustand + React Query (`@tanstack/react-query`) + axios. У каждого свой `src/lib/api.ts` с axios-инстансом и интерсептором, добавляющим Bearer-токен из localStorage. **Ключи токенов различаются**: telegram-app — `token`, admin-panel — `admin_token` (у admin есть response-интерсептор: 401 → редирект на `/login`). Базовый URL API из `import.meta.env.VITE_API_URL` (дефолт `http://localhost:3000/api`).

- `telegram-app`: обёртка над Telegram WebApp SDK в `src/lib/telegram.ts` (`tg = window.Telegram?.WebApp`), `TelegramProvider`. Конвертация ссылок Rutube в embed — `src/utils/video.ts`. Навигация — 4 таба (Главная / Тренировки / Рецепты / Профиль).
- `admin-panel`: формы на `react-hook-form`, rich-text через `react-quill`, drag-and-drop сортировка через `@dnd-kit`.

## Развёрнутый сервер
Боевая версия уже развёрнута на облачном сервере (IPv4 `85.239.63.189`).

Доступы (SSH, пароли) хранятся вне репозитория в `CREDENTIALS.local.md` (в `.gitignore`, в Git не попадает). Подробности деплоя — в `DEPLOY.md` / `DEPLOY_NOW.md` / `GITHUB_DEPLOY.md`.

## Заметки
- Глобальный `ValidationPipe` с `whitelist: true, transform: true` — все DTO должны быть с `class-validator`/`class-transformer`.
- Лимит размера тела запроса поднят до 50MB (в `main.ts`), для загрузок используется `multer` (`MAX_FILE_SIZE`, `UPLOAD_DIR` в env).
- Документация по деплою: `DEPLOY.md`, `DEPLOY_NOW.md`, `GITHUB_DEPLOY.md`; настройка Payme — `PAYME_SETUP.md`; сводка API — `API.md`.
