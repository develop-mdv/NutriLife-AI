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

## 🚀 Deployment & Updates

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose installed on the server.
- A **MongoDB** instance (or use the one provided in `docker-compose`).
- A **Google Gemini API Key**.

### Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```ini
PORT=4000
# Connection string to MongoDB (use 'mongo' hostname if using docker-compose)
MONGO_URI=mongodb://mongo:27017/nutrilife
# Secret key for JWT signing
JWT_SECRET=your_super_secret_jwt_key
# API Key for Google Gemini
GEMINI_API_KEY=your_gemini_api_key
```

### Deploying with Docker

The easiest way to run the server (and a local MongoDB database) is using Docker Compose.

1.  **Build and Start**:
    ```bash
    docker-compose up --build -d
    ```
    This command builds the image and runs the containers in detached mode (`-d`).

2.  **View Logs**:
    ```bash
    docker-compose logs -f
    ```

3.  **Stop Server**:
    ```bash
    docker-compose down
    ```

### Updating the Server

When you have made changes to the code and pushed them to your server (e.g., via `git pull`), follow these steps to update the running application:

1.  **Pull latest changes** (if using git):
    ```bash
    git pull origin main
    ```

2.  **Rebuild and Restart**:
    Docker Compose will detect changes, rebuild the image, and recreate the container with zero downtime (mostly).
    ```bash
    docker-compose up --build -d
    ```

3.  **Verify**:
    Check if the container is running and healthy:
    ```bash
    docker ps
    docker-compose logs -f --tail=50
    ```
