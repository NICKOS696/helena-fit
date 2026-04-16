# 🚀 Деплой через GitHub

## 📋 Преимущества:
- ✅ Легко обновлять приложение (`git pull`)
- ✅ История всех изменений
- ✅ Откат к предыдущей версии если что-то сломалось
- ✅ Можно работать с разных компьютеров

---

## Шаг 1: Создание GitHub репозитория

### 1.1 Создайте репозиторий на GitHub:
1. Перейдите на https://github.com
2. Нажмите "New repository"
3. Название: `helena-fit` (или любое другое)
4. Выберите **Private** (чтобы код был приватным)
5. НЕ добавляйте README, .gitignore, license (у нас уже есть)
6. Нажмите "Create repository"

### 1.2 Скопируйте URL репозитория:
Например: `https://github.com/your-username/helena-fit.git`

---

## Шаг 2: Загрузка кода в GitHub

### 2.1 На вашем компьютере (в папке проекта):

```bash
cd "C:\Users\Николай Филиппов\CascadeProjects\Helena Fit"

# Инициализируем Git (если еще не сделано)
git init

# Добавляем все файлы
git add .

# Делаем первый коммит
git commit -m "Initial commit: Helena Fit Bot"

# Добавляем remote (замените URL на ваш!)
git remote add origin https://github.com/your-username/helena-fit.git

# Загружаем на GitHub
git branch -M main
git push -u origin main
```

### 2.2 Если Git спросит логин/пароль:
- Используйте **Personal Access Token** вместо пароля
- Создайте токен: GitHub → Settings → Developer settings → Personal access tokens → Generate new token
- Права: `repo` (full control of private repositories)

---

## Шаг 3: Деплой на сервер через GitHub

### 3.1 Подключитесь к серверу:
```bash
ssh root@85.239.63.189
```

### 3.2 Установите Git (если нет):
```bash
apt update
apt install -y git
```

### 3.3 Клонируйте репозиторий:
```bash
cd /var/www
git clone https://github.com/your-username/helena-fit.git
cd helena-fit
```

### 3.4 Если репозиторий приватный:
```bash
# Вариант 1: HTTPS с токеном
git clone https://YOUR_TOKEN@github.com/your-username/helena-fit.git

# Вариант 2: SSH (рекомендуется)
# Сначала настройте SSH ключ на сервере
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# Скопируйте ключ и добавьте в GitHub: Settings → SSH keys → Add SSH key
# Потом клонируйте:
git clone git@github.com:your-username/helena-fit.git
```

### 3.5 Создайте .env файл на сервере:
```bash
cd /var/www/helena-fit
nano .env
```

Вставьте конфигурацию (НЕ загружайте .env в Git!):
```env
# Database
DB_PASSWORD=your_secure_password_here

# JWT
JWT_SECRET=your-super-long-random-secret-key

# Telegram
TELEGRAM_BOT_TOKEN=8676161809:AAEUArS36PzRCE3-7v45lUCPG-sgzCuB5b0

# URLs
TELEGRAM_APP_URL=https://85.239.63.189
ADMIN_PANEL_URL=https://85.239.63.189/admin

# Payme
PAYME_MERCHANT_ID=68c7b7859ac2828cbcccc4ed
PAYME_TEST_KEY=q%#9mdaAId9tsNVR9Nfe27PdP@Rqys62DK76
PAYME_PROD_KEY=m1k%&o0dXhJabWM@5?kz7aS3TIs7y#%nXJ#q
PAYME_ENDPOINT=https://checkout.paycom.uz
PAYME_CALLBACK_URL=https://85.239.63.189/api/payme/callback
```

### 3.6 Запустите Docker:
```bash
docker-compose up -d
```

---

## Шаг 4: Обновление приложения (в будущем)

### На вашем компьютере (после изменений):
```bash
cd "C:\Users\Николай Филиппов\CascadeProjects\Helena Fit"

# Добавляем изменения
git add .

# Коммитим с описанием
git commit -m "Описание изменений"

# Загружаем на GitHub
git push
```

### На сервере (обновление):
```bash
cd /var/www/helena-fit

# Скачиваем изменения
git pull

# Перезапускаем контейнеры
docker-compose down
docker-compose up -d --build

# Или только backend если меняли только его
docker-compose restart backend
```

---

## Шаг 5: Полезные команды Git

### Посмотреть статус:
```bash
git status
```

### Посмотреть историю:
```bash
git log --oneline
```

### Откатиться к предыдущей версии:
```bash
# Посмотреть коммиты
git log --oneline

# Откатиться к конкретному коммиту
git checkout <commit-hash>

# Вернуться к последней версии
git checkout main
```

### Создать ветку для тестирования:
```bash
# Создать ветку
git checkout -b test-feature

# Переключиться обратно на main
git checkout main
```

---

## 🔒 Безопасность

### ❌ НИКОГДА не загружайте в Git:
- `.env` файлы с паролями
- `node_modules/`
- `uploads/` с пользовательскими файлами
- Приватные ключи
- Токены и пароли

### ✅ Всегда загружайте:
- Исходный код
- `package.json`
- `docker-compose.yml`
- `.env.example` (шаблон без реальных паролей)
- Документацию

---

## 📊 Структура репозитория

```
helena-fit/
├── backend/              # Backend API
├── telegram-app/         # Telegram Mini App
├── admin-panel/          # Admin Panel
├── docker-compose.yml    # Docker конфигурация
├── .env.example          # Шаблон переменных окружения
├── .gitignore           # Что не загружать в Git
├── DEPLOY.md            # Инструкция по деплою
├── README.md            # Описание проекта
└── .env                 # НЕ в Git! Только на сервере!
```

---

## ✅ Готово!

Теперь у вас:
- ✅ Код в GitHub
- ✅ Легкое обновление через `git pull`
- ✅ История изменений
- ✅ Безопасное хранение

**Следующий шаг:** Создайте репозиторий на GitHub и загрузите код! 🚀
