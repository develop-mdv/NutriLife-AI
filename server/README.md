# NutriLife AI - Backend Server

The backend server for NutriLife AI, built with Node.js and Express. It powers the mobile application's data persistence, authentication, and AI features using Google's Gemini models.

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT (JSON Web Tokens)
- **AI Integration**: Google Generative AI SDK (Gemini 2.5 Flash)
- **Language**: TypeScript
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions

## 📂 Project Structure

- **`src/index.ts`**: Entry point of the application.
- **`src/routes`**: API route controllers.
  - `auth.ts`: Registration and Login.
  - `me.ts`: User profile, settings, and daily stats management.
  - `ai.ts`: AI chat and food analysis endpoints.
  - `walks.ts`: Step tracking endpoints.
- **`src/models`**: MongoDB Mongoose schemas (User, Profile, FoodEntry, ChatMessage, etc.).
- **`src/middleware`**: Express middlewares (Authentication, Error handling).
- **`src/services`**: Business logic helper functions.

## 🤖 AI Features

The server integrates with **Google Gemini 2.5 Flash** to provide:
- **Context-Aware Chat**: The AI assistant has access to the user's profile, health goals, recent meals, and daily stats to provide personalized advice.
- **Food Analysis**: Endpoint accepts food images (Base64), identifies the dish, and estimates calories/macros (B/F/C) along with a health rating.

## 🧑‍💻 Локальная разработка

### Prerequisites

- [Docker](https://www.docker.com/) и Docker Compose
- Google Gemini API Key

### Environment Variables

Создайте файл `.env` в директории `server/`:

```ini
PORT=4000
MONGO_URI=mongodb://mongo:27017/nutrilife
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_gemini_api_key
```

### Запуск в dev-режиме (hot-reload)

```bash
cd server
npm install
npm run dev
```

Сервер запустится с `ts-node-dev` и будет автоматически перезапускаться при изменениях в `src/`.

---

## 🚀 Production-деплой на VPS

### Первоначальная настройка сервера

1. **Установите Docker и Docker Compose** на VPS.

2. **Клонируйте репозиторий**:
    ```bash
    git clone <your-repo-url> /opt/nutrilife
    cd /opt/nutrilife/server
    ```

3. **Создайте `.env`** с production-значениями:
    ```ini
    PORT=4000
    MONGO_URI=mongodb://mongo:27017/nutrilife
    JWT_SECRET=<сгенерируйте_надёжный_ключ>
    GEMINI_API_KEY=<ваш_gemini_api_key>
    ```

4. **Запустите**:
    ```bash
    docker compose up -d --build
    ```

5. **Проверьте**:
    ```bash
    # Статус контейнеров
    docker ps

    # Health check
    curl http://localhost:4000/api/health
    # Ожидаемый ответ: {"ok":true}

    # Логи
    docker compose logs -f --tail=50
    ```

### Ручное обновление

```bash
cd /opt/nutrilife
git pull origin main
cd server
docker compose up -d --build
```

---

## 🔄 CI/CD — Автоматический деплой

Проект настроен на **автоматический деплой** серверной части при пуше в ветку `main`. Workflow запускается **только при изменениях в директории `server/`**.

### Что происходит при деплое

1. GitHub Actions подключается к VPS по SSH.
2. Выполняет `git pull origin main`.
3. Пересобирает и поднимает контейнеры (`docker compose up -d --build`).
4. Проверяет health check (`/api/health`).
5. При ошибке — **автоматический откат** на предыдущую версию образа.

### Настройка GitHub Secrets

Перейдите в **GitHub → Settings → Secrets and variables → Actions** и добавьте:

| Secret | Описание | Пример |
|---|---|---|
| `VPS_HOST` | IP-адрес или домен VPS | `123.45.67.89` |
| `VPS_USER` | SSH-пользователь | `deploy` |
| `VPS_SSH_KEY` | Приватный SSH-ключ (содержимое файла) | `-----BEGIN OPENSSH...` |
| `VPS_REPO_PATH` | Путь к репозиторию на VPS | `/opt/nutrilife` |

### Генерация SSH-ключа для деплоя

На **локальной машине**:

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/deploy_key
```

На **VPS** добавьте публичный ключ:

```bash
cat deploy_key.pub >> ~/.ssh/authorized_keys
```

Содержимое **приватного** ключа (`deploy_key`) скопируйте в GitHub Secret `VPS_SSH_KEY`.

### Файл workflow

Расположение: `.github/workflows/deploy-server.yml` (в корне монорепозитория).

Деплой запускается автоматически. Статус можно отслеживать на вкладке **Actions** в GitHub.

---

## 📁 Docker-файлы

| Файл | Назначение |
|---|---|
| `Dockerfile` | Production — multi-stage build (компиляция TS → запуск `node`) |
| `docker-compose.yml` | Production compose с healthcheck и restart policy |
