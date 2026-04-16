FROM node:18-alpine

# Устанавливаем OpenSSL для Prisma
RUN apk add --no-cache openssl

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

# Открываем порт
EXPOSE 3000

# Команда запуска будет в docker-compose.yml
CMD ["npm", "run", "start:dev"]
