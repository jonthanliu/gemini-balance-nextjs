# Gemini Balance - Next.js Edition

This project is a high-performance, feature-rich Next.js implementation inspired by the `gemini-balance` Python project. It functions as an intelligent AI gateway, receiving requests through multiple API formats (including OpenAI-compatible) and routing them to Google's Gemini models.

This version goes beyond a simple proxy, offering a robust feature set including a management dashboard, persistent configuration, and advanced authentication, making it a powerful and flexible solution for developers.

## Core Features

- **Multi-API Interface**:
  - **`/v1beta` & `/gemini`**: Gemini-native proxy endpoints with flexible authentication (API key in URL, `x-goog-api-key` header, or Bearer token).
  - **`/openai`**: An OpenAI-compatible endpoint that requires strict Bearer token authentication.
- **Intelligent Load Balancing**: Manages a pool of Gemini API keys, rotating them to distribute request loads.
- **Automatic Failover & Retry**: If a request fails, it automatically retries with the next available key, ensuring high availability.
- **Persistent Health Tracking**: Monitors key failures, automatically sidelining failing keys and syncing their status to a persistent database.
- **Web UI & Management Dashboard**:
  - A simple chat interface for testing.
  - An admin dashboard at `/admin` to view key status, manage settings, and monitor logs.
- **Database Persistence**: Uses Prisma and a SQLite database to store API keys and application settings.
- **Secure Authentication**:
  - Protects the admin dashboard with a dedicated `AUTH_TOKEN`.
  - Secures API endpoints with a flexible system of `ALLOWED_TOKENS`.

## Project Structure & Code Guide

To understand the project, we recommend exploring the files in the following order:

1.  **`src/middleware.ts`**: The entry point for all incoming requests. This file handles routing and authentication logic, directing traffic to the correct handler based on the path.
2.  **`src/lib/gemini-proxy.ts`**: The core proxying logic. It receives requests from the API routes, retrieves a working API key, and forwards the request to the Google Gemini API.
3.  **`src/lib/key-manager.ts`**: The `KeyManager` class, responsible for all API key management, including loading keys from the environment and database, rotation, and failure tracking.
4.  **`src/app/(api-proxy)`**: Directory containing the API routes (`/gemini`, `/openai`, `/v1beta`). These routes are lightweight and delegate all logic to the middleware and proxy.
5.  **`src/app/admin`**: The code for the admin dashboard, including the UI components and server-side actions for managing the application.
6.  **`prisma/schema.prisma`**: Defines the database schema for storing API keys and settings.

## Getting Started

Follow these steps to get the project running locally.

### 1. Install Dependencies

Navigate to the project directory and install the necessary packages.

```bash
pnpm install
```

### 2. Initialize the Database

This project uses Prisma for database management. Run the following command to create the SQLite database and apply the schema.

```bash
pnpm prisma migrate dev
```

This will create a `prisma/dev.db` file.

### 3. Configure Environment Variables

- Create a `.env.local` file by copying the example: `cp .env.example .env.local`.
- Open `.env.local` and set the following variables:

```env
# .env.local

# 1. Gemini API Keys (Required)
# Comma-separated list of your Google AI Gemini API keys.
# These are loaded into the database on the first run.
GEMINI_API_KEYS=your_gemini_key_1,your_gemini_key_2

# 2. Admin Dashboard Authentication Token (Required)
# A secret token to access the admin panel at /admin.
AUTH_TOKEN=a_strong_and_secret_token_for_ui

# 3. API Access Tokens (Optional)
# Comma-separated list of tokens allowed to access the API endpoints.
# If you leave this blank, you can still use your AUTH_TOKEN for API access.
ALLOWED_TOKENS=user_token_1,user_token_2

# 4. Key Failure Threshold (Optional, Default: 3)
# Maximum number of consecutive failures before a key is marked as invalid.
MAX_FAILURES=3

# 5. Proxy URL (Optional)
# If your server is in a region not supported by the Gemini API,
# you can provide an HTTP/HTTPS proxy URL to route requests through.
# Example: PROXY_URL=http://user:pass@host:port
PROXY_URL=
```

### 4. Run the Development Server

Start the Next.js development server.

```bash
pnpm dev
```

## Deployment with Docker

For a more production-like setup, you can use Docker and Docker Compose to run the application in a container.

### 1. Configure Environment for Docker

The `docker-compose.yml` file reads environment variables from a `.env` file in the project root. You can simply rename your `.env.local` file to `.env` or create a copy.

```bash
cp .env.local .env
```

Ensure your `.env` file contains all the required variables (`GEMINI_API_KEYS`, `AUTH_TOKEN`, etc.).

### 2. Build and Run the Container

Use Docker Compose to build the image and start the container in detached mode.

```bash
docker-compose up --build -d
```

The application will be available at `http://localhost:3000`.

### 3. Database Persistence

The `docker-compose.yml` is configured to persist the SQLite database. It mounts the local `./prisma` directory to `/app/prisma` inside the container. This means your database file (`dev.db`) is stored on your host machine and will not be lost if the container is stopped or restarted.

The first time you run the container, you may need to run the database migration command inside the container:

```bash
docker-compose exec app pnpm prisma migrate dev
```

### 4. Viewing Logs and Stopping

- To view the application logs: `docker-compose logs -f`
- To stop the application: `docker-compose down`

## CI/CD with GitHub Actions

This project includes a GitHub Actions workflow to automatically build and push the Docker image to Docker Hub whenever changes are pushed to the `main` branch.

### 1. Fork the Repository

First, fork this repository to your own GitHub account.

### 2. Configure GitHub Secrets

For the workflow to access your Docker Hub account, you must configure the following secrets in your GitHub repository's settings (`Settings` > `Secrets and variables` > `Actions`):

- **`DOCKERHUB_USERNAME`**: Your Docker Hub username.
- **`DOCKERHUB_TOKEN`**: A Docker Hub access token. You can generate one in your Docker Hub account settings.

### 3. How It Works

- The workflow is defined in `.github/workflows/deploy.yml`.
- On every push to the `main` branch, the action will:
  1. Check out the code.
  2. Log in to Docker Hub using your stored secrets.
  3. Build the Docker image.
  4. Push the image to your Docker Hub repository, tagging it as `your_username/gemini-balance-nextjs:latest`.

You can then pull this image on your server to deploy the latest version of the application.

### 5. Explore the Application

- **Admin Dashboard**: Open [http://localhost:3000/admin](http://localhost:3000/admin) and log in with your `AUTH_TOKEN`. Here you can see the status of your `GEMINI_API_KEYS`.
- **API Endpoints**: Use a tool like `curl` or Postman to interact with the API endpoints, providing a token from `ALLOWED_TOKENS` or your `AUTH_TOKEN`.

**Example `curl` for Gemini/v1beta:**

```bash
curl -X POST http://localhost:3000/v1beta/models/gemini-pro:generateContent?key=user_token_1 \
-H "Content-Type: application/json" \
-d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

**Example `curl` for OpenAI:**

```bash
curl -X POST http://localhost:3000/openai/v1/chat/completions \
-H "Content-Type: application/json" \
-H "Authorization: Bearer user_token_1" \
-d '{"model": "gemini-pro", "messages": [{"role": "user", "content": "Hello!"}]}'
```
