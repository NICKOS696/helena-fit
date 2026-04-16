FROM node:18-alpine

WORKDIR /app

# Копируем package.json
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы
COPY . .

# Генерируем Prisma Client
RUN npx prisma generate

# Собираем приложение
RUN npm run build

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "run", "start:prod"]
