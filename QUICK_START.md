# ⚡ Быстрый старт - Helena Fit

## 🎯 Что нужно сделать:

1. ✅ Создать GitHub репозиторий
2. ✅ Загрузить код
3. ✅ Проверить сервер
4. ✅ Развернуть через Docker
5. ✅ Настроить Telegram бот

---

## 📝 Шаг 1: GitHub (5 минут)

### 1.1 Создайте репозиторий:
- Перейдите на https://github.com/new
- Название: `helena-fit`
- Тип: **Private** (приватный)
- Нажмите "Create repository"

### 1.2 Загрузите код:
```bash
cd "C:\Users\Николай Филиппов\CascadeProjects\Helena Fit"

# Инициализация Git
git init
git add .
git commit -m "Initial commit: Helena Fit Bot"

# Подключение к GitHub (замените URL!)
git remote add origin https://github.com/YOUR_USERNAME/helena-fit.git
git branch -M main
git push -u origin main
```

**Готово!** Код в GitHub ✅

---

## 🔍 Шаг 2: Проверка сервера (5 минут)

### 2.1 Подключитесь к серверу:
```bash
ssh root@85.239.63.189
```
Пароль: `<see CREDENTIALS.local.md>`

### 2.2 Запустите проверку:
Скопируйте команды из файла `SERVER_CHECK.md` и выполните на сервере.

### 2.3 Пришлите мне результат
Я проанализирую и скажу безопасно ли деплоить.

---

## 🚀 Шаг 3: Деплой (10 минут)

### 3.1 На сервере клонируйте репозиторий:
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/helena-fit.git
cd helena-fit
```

### 3.2 Создайте .env файл:
```bash
cp .env.example .env
nano .env
```

Вставьте:
```env
DB_PASSWORD=<TAKE_FROM_ENV__DO_NOT_COMMIT>
JWT_SECRET=<TAKE_FROM_ENV__DO_NOT_COMMIT>
TELEGRAM_BOT_TOKEN=<TAKE_FROM_ENV__DO_NOT_COMMIT>
TELEGRAM_APP_URL=https://85.239.63.189
ADMIN_PANEL_URL=https://85.239.63.189/admin
PAYME_MERCHANT_ID=<TAKE_FROM_ENV__DO_NOT_COMMIT>
PAYME_TEST_KEY=<TAKE_FROM_ENV__DO_NOT_COMMIT>
PAYME_PROD_KEY=<TAKE_FROM_ENV__DO_NOT_COMMIT>
PAYME_ENDPOINT=https://checkout.paycom.uz
PAYME_CALLBACK_URL=https://85.239.63.189/api/payme/callback
```

### 3.3 Запустите Docker:
```bash
docker-compose up -d
```

### 3.4 Проверьте:
```bash
docker-compose ps
docker-compose logs -f backend
```

**Готово!** Backend работает ✅

---

## 📱 Шаг 4: Frontend (5 минут)

### 4.1 На вашем компьютере соберите:
```bash
# Telegram App
cd telegram-app
npm run build

# Admin Panel
cd ../admin-panel
npm run build
```

### 4.2 Загрузите на сервер:
```bash
# Из корня проекта
scp -r telegram-app/dist root@85.239.63.189:/var/www/helena-fit/telegram-app/
scp -r admin-panel/dist root@85.239.63.189:/var/www/helena-fit/admin-panel/
```

**Готово!** Frontend загружен ✅

---

## 🤖 Шаг 5: Telegram бот (2 минуты)

### 5.1 Настройте бота в BotFather:
1. Откройте @BotFather
2. `/mybots` → выберите вашего бота
3. "Bot Settings" → "Menu Button"
4. Введите URL: `https://85.239.63.189`

### 5.2 Проверьте:
Откройте бота в Telegram и нажмите кнопку меню!

**Готово!** Бот работает ✅

---

## ✅ Итого: ~30 минут

1. ✅ Код в GitHub
2. ✅ Backend на сервере
3. ✅ Frontend развернут
4. ✅ Telegram бот работает
5. ✅ Payme интегрирован

---

## 🔄 Обновление в будущем

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

**Готово!** Обновление за 1 минуту ✅

---

## 🆘 Нужна помощь?

Смотрите подробные инструкции:
- 📖 [DEPLOY.md](./DEPLOY.md)
- 📖 [GITHUB_DEPLOY.md](./GITHUB_DEPLOY.md)
- 📖 [SERVER_CHECK.md](./SERVER_CHECK.md)

**Удачи! 🚀**
