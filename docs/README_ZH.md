# Gemini Balance - Next.js 版本

本项目是 `gemini-balance` Python 项目的高性能、功能丰富的 Next.js 实现。它作为一个智能 AI 网关，通过多种 API 格式（包括 OpenAI 兼容格式）接收请求，并将其路由到 Google 的 Gemini 模型。

该版本超越了简单的代理，提供了一套强大的功能集，包括管理仪表盘、持久化配置和高级身份验证，使其成为一个功能强大且灵活的开发解决方案。

## 核心功能

- **多 API 接口**:
  - **`/v1beta` 和 `/gemini`**: Gemini 原生代理端点，支持灵活的身份验证（URL 中的 API 密钥、`x-goog-api-key` 请求头或 Bearer 令牌）。
  - **`/openai`**: OpenAI 兼容端点，要求严格的 Bearer 令牌身份验证。
- **智能负载均衡**: 管理一个 Gemini API 密钥池，轮流使用密钥以分配请求负载。
- **自动故障转移与重试**: 如果使用特定密钥的请求失败，系统会自动使用下一个可用密钥重试，确保服务的高可用性。
- **持久化健康跟踪**: 监控密钥失败次数，自动将失败的密钥移出活动池，并将其状态同步到持久化数据库。
- **Web UI 与管理仪表盘**:
  - 一个用于测试的简单聊天界面。
  - 位于 `/admin` 的管理仪表盘，用于查看密钥状态、管理设置和监控日志。
- **数据库持久化**: 使用 Prisma 和 SQLite 数据库存储 API 密钥和应用设置。
- **安全身份验证**:
  - 使用专用的 `AUTH_TOKEN` 保护管理仪表盘。
  - 使用灵活的 `ALLOWED_TOKENS` 系统保护 API 端点。

## 项目结构与代码导览

为了更好地理解本项目，我们建议按以下顺序探索文件：

1.  **`src/middleware.ts`**: 所有传入请求的入口点。该文件处理路由和身份验证逻辑，根据路径将流量引导至正确的处理程序。
2.  **`src/lib/gemini-proxy.ts`**: 核心代理逻辑。它从 API 路由接收请求，获取一个可用的 API 密钥，并将请求转发给 Google Gemini API。
3.  **`src/lib/key-manager.ts`**: `KeyManager` 类，负责所有 API 密钥管理，包括从环境和数据库加载密钥、轮换和失败跟踪。
4.  **`src/app/(api-proxy)`**: 包含 API 路由（`/gemini`, `/openai`, `/v1beta`）的目录。这些路由非常轻量，将所有逻辑委托给中间件和代理。
5.  **`src/app/admin`**: 管理仪表盘的代码，包括 UI 组件和用于管理应用的服务器端操作。
6.  **`prisma/schema.prisma`**: 定义用于存储 API 密钥和设置的数据库 schema。

## 快速上手

请按照以下步骤在本地运行本项目。

### 1. 安装依赖

进入项目目录并安装所需依赖包。

```bash
pnpm install
```

### 2. 初始化数据库

本项目使用 Prisma 进行数据库管理。运行以下命令创建 SQLite 数据库并应用 schema。

```bash
pnpm prisma migrate dev
```

这将在 `prisma/` 目录下创建一个 `dev.db` 文件。

### 3. 配置环境变量

- 通过复制示例文件来创建一个 `.env.local` 文件：`cp .env.example .env.local`。
- 打开 `.env.local` 并设置以下变量：

```env
# .env.local

# 1. Gemini API 密钥 (必需)
# 您的 Google AI Gemini API 密钥，以逗号分隔。
# 这些密钥将在首次运行时加载到数据库中。
GEMINI_API_KEYS=your_gemini_key_1,your_gemini_key_2

# 2. 管理仪表盘认证令牌 (必需)
# 用于访问 /admin 管理面板的秘密令牌。
AUTH_TOKEN=a_strong_and_secret_token_for_ui

# 3. API 访问令牌 (可选)
# 允许访问 API 端点的令牌列表，以逗号分隔。
# 如果留空，您仍然可以使用您的 AUTH_TOKEN 访问 API。
ALLOWED_TOKENS=user_token_1,user_token_2

# 4. 密钥失败阈值 (可选, 默认: 3)
# 在将密钥标记为无效之前，允许的最大连续失败次数。
MAX_FAILURES=3

# 5. 代理服务器地址 (可选)
# 如果您的服务器位于 Gemini API 不支持的地区，
# 您可以提供一个 HTTP/HTTPS 代理服务器地址来转发请求。
# 示例: PROXY_URL=http://user:pass@host:port
PROXY_URL=
```

### 4. 运行开发服务器

启动 Next.js 开发服务器。

```bash
pnpm dev
```

## 使用 Docker 部署

对于更接近生产环境的设置，您可以使用 Docker 和 Docker Compose 在容器中运行该应用。

### 1. 为 Docker 配置环境

`docker-compose.yml` 文件会从项目根目录下的 `.env` 文件中读取环境变量。您只需将 `.env.local` 文件重命名为 `.env` 或创建一个副本即可。

```bash
cp .env.local .env
```

请确保您的 `.env` 文件包含了所有必需的变量（如 `GEMINI_API_KEYS`, `AUTH_TOKEN` 等）。

### 2. 构建并运行容器

使用 Docker Compose 构建镜像并以分离模式启动容器。

```bash
docker-compose up --build -d
```

应用将在 `http://localhost:3000` 上可用。

### 3. 数据库持久化

`docker-compose.yml` 已配置为持久化 SQLite 数据库。它将本地的 `./prisma` 目录挂载到容器内的 `/app/prisma`。这意味着您的数据库文件 (`dev.db`) 将存储在您的主机上，即时容器被停止或重启也不会丢失。

首次运行容器时，您可能需要在容器内部执行数据库迁移命令：

```bash
docker-compose exec app pnpm prisma migrate dev
```

### 4. 查看日志与停止应用

- 查看应用日志: `docker-compose logs -f`
- 停止应用: `docker-compose down`

## 使用 GitHub Actions 进行 CI/CD

本项目包含一个 GitHub Actions 工作流，可以在代码被推送到 `main` 分支时，自动构建 Docker 镜像并将其推送到 Docker Hub。

### 1. Fork 本仓库

首先，将此仓库 fork 到您自己的 GitHub 账户下。

### 2. 配置 GitHub Secrets

为了让工作流能够访问您的 Docker Hub 账户，您必须在您的 GitHub 仓库设置中配置以下 secrets（`Settings` > `Secrets and variables` > `Actions`）：

- **`DOCKERHUB_USERNAME`**: 您的 Docker Hub 用户名。
- **`DOCKERHUB_TOKEN`**: 您的 Docker Hub 访问令牌。您可以在 Docker Hub 的账户设置中生成一个。

### 3. 工作原理

- 工作流定义在 `.github/workflows/deploy.yml` 文件中。
- 每当有代码推送到 `main` 分支时，该 action 将会：
  1. 检出代码。
  2. 使用您存储的 secrets 登录到 Docker Hub。
  3. 构建 Docker 镜像。
  4. 将镜像推送到您的 Docker Hub 仓库，并标记为 `your_username/gemini-balance-nextjs:latest`。

之后，您便可以在您的服务器上拉取这个镜像，以部署最新版本的应用。

### 5. 探索应用

- **管理仪表盘**: 打开 [http://localhost:3000/admin](http://localhost:3000/admin) 并使用您的 `AUTH_TOKEN` 登录。在这里您可以看到 `GEMINI_API_KEYS` 的状态。
- **API 端点**: 使用 `curl` 或 Postman 等工具与 API 端点交互，请提供 `ALLOWED_TOKENS` 中的令牌或您的 `AUTH_TOKEN`。

**Gemini/v1beta `curl` 示例:**

```bash
curl -X POST http://localhost:3000/v1beta/models/gemini-pro:generateContent?key=user_token_1 \
-H "Content-Type: application/json" \
-d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

**OpenAI `curl` 示例:**

```bash
curl -X POST http://localhost:3000/openai/v1/chat/completions \
-H "Content-Type: application/json" \
-H "Authorization: Bearer user_token_1" \
-d '{"model": "gemini-pro", "messages": [{"role": "user", "content": "Hello!"}]}'
```
