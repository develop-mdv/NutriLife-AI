FROM node:22-alpine

WORKDIR /app

# Копируем package.json и lock-файл (если есть)
COPY package.json package-lock.json* ./

# Устанавливаем зависимости
RUN npm install

# Копируем tsconfig и исходники
COPY tsconfig.json ./
COPY src ./src

EXPOSE 4000

# Dev-режим: ts-node-dev, авто-перезапуск при изменениях
CMD ["npm", "run", "dev"]
