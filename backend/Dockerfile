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

# Генерируем Prisma Client и собираем production-бандл в dist/
RUN npx prisma generate
RUN npm run build

# Открываем порт
EXPOSE 3000

# По умолчанию prod-запуск; docker-compose переопределяет command при необходимости
CMD ["npm", "run", "start:prod"]
