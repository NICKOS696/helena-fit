# 🚀 Интеграция Payme - Инструкция по запуску

## ✅ Что уже сделано:

1. ✅ Создан Payme Service для работы с API
2. ✅ Создан Payme Controller с endpoints
3. ✅ Добавлена модель Transaction в базу данных
4. ✅ Обновлены кнопки "Купить" в Telegram App
5. ✅ Добавлен API клиент для создания платежей

---

## 📝 Что нужно сделать:

### 1. Добавить переменные окружения

Откройте файл `backend/.env` и добавьте:

```env
# Payme
PAYME_MERCHANT_ID="68c7b7859ac2828cbcccc4ed"
PAYME_TEST_KEY="q%#9mdaAId9tsNVR9Nfe27PdP@Rqys62DK76"
PAYME_PROD_KEY="m1k%&o0dXhJabWM@5?kz7aS3TIs7y#%nXJ#q"
PAYME_ENDPOINT="https://checkout.paycom.uz"
PAYME_CALLBACK_URL="http://localhost:3000/api/payme/callback"
```

### 2. Запустить миграцию базы данных

```bash
cd backend
npx prisma migrate dev --name add_transactions
```

### 3. Перезапустить backend

```bash
npm run start:dev
```

---

## 🧪 Как протестировать:

### 1. Откройте Telegram App
- Перейдите в любой сборник тренировок или рецептов
- Нажмите кнопку "Купить сборник"

### 2. Что должно произойти:
- Откроется новая вкладка с формой оплаты Payme
- Вы увидите сумму к оплате
- Можете оплатить тестовой картой

### 3. Тестовые карты Payme:
```
Номер карты: 8600 4954 7331 6478
Срок: 03/99
CVV: любой
```

### 4. После успешной оплаты:
- Webhook от Payme придет на `/api/payme/callback`
- Транзакция обновится в БД
- Пользователю автоматически выдастся доступ к сборнику

---

## 🔍 Как проверить что все работает:

### 1. Проверить создание транзакции:
```sql
SELECT * FROM transactions ORDER BY "createdAt" DESC LIMIT 5;
```

### 2. Проверить выдачу доступа:
```sql
SELECT * FROM workout_collection_access ORDER BY "grantedAt" DESC LIMIT 5;
SELECT * FROM recipe_collection_access ORDER BY "grantedAt" DESC LIMIT 5;
```

### 3. Логи backend:
Смотрите в консоли backend - там будут логи от Payme webhook

---

## 📊 Как работает процесс оплаты:

```
1. Пользователь нажимает "Купить"
   ↓
2. Frontend создает транзакцию через POST /api/payme/create-payment
   ↓
3. Backend создает запись в БД (status: PENDING)
   ↓
4. Backend возвращает ссылку на оплату Payme
   ↓
5. Пользователь переходит на страницу Payme и оплачивает
   ↓
6. Payme отправляет webhook на /api/payme/callback
   ↓
7. Backend обновляет транзакцию (status: SUCCESS)
   ↓
8. Backend выдает доступ к сборнику
   ↓
9. Пользователь обновляет страницу и видит контент!
```

---

## 🚨 Возможные проблемы:

### Проблема: "Transaction not found"
**Решение:** Проверьте что транзакция создалась в БД

### Проблема: "Unauthorized" в webhook
**Решение:** Проверьте что PAYME_TEST_KEY правильный

### Проблема: Доступ не выдается
**Решение:** Проверьте логи backend, возможно ошибка в методе grantAccess

---

## 🎯 Следующие шаги:

1. ✅ Протестировать оплату
2. ⏳ Деплой на сервер
3. ⏳ Настроить webhook URL на production
4. ⏳ Переключиться на PROD ключ
5. ⏳ Заполнить контентом
6. ⏳ Запустить! 🚀
