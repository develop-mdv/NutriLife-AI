# NutriLife AI

Монорепозиторий проекта NutriLife AI - умного трекера питания и фитнеса на базе Gemini.

## Структура проекта

*   **`/mobile`** - Мобильное приложение (React Native / Expo).
*   **`/web`** - Веб-приложение (React / Vite).
*   **`/server`** - Бэкенд сервер (Node.js / Express / MongoDB).
*   **`/design`** - Материалы и референсы дизайна.

## Запуск локально

### Веб-приложение
```bash
cd web
npm install
npm run dev
```

### Мобильное приложение
```bash
cd mobile
npm install
# Запуск Expo
npm start
```
Для запуска на Android/iOS используйте соответствующие команды Expo (`a`, `i`).

### Сервер
```bash
cd server
npm install
npm run dev
```
Сервер запустится на порту, указанном в `.env` сервера.

## Требования
*   Node.js
*   Gemini API Key (для работы ИИ-функций)
