# Gemini Balance - Next.js 版本

You can read this document in [English](README.md).

本项目是 `gemini-balance` Python 项目的高性能、功能丰富的 Next.js 实现。它作为一个智能 AI 网关，通过多种 API 格式（包括 OpenAI 兼容格式）接收请求，并将其路由到 Google 的 Gemini 模型。

该版本超越了简单的代理，提供了一套强大的功能集，包括管理仪表盘、持久化配置和高级身份验证，使其成为一个功能强大且灵活的开发解决方案。

## 重要说明

- **项目来源与致谢**: 本项目是原始 Python 项目 [gemini-balance](https://github.com/snailyp/gemini-balance) 的 Next.js 实现。特别感谢原作者的灵感。目前，项目仅实现了核心的 API 转发和管理能力，其他功能正在陆续开发中。
- **AI 生成**: 除了本段声明外，本项目中的所有代码和文档均由 Google 的 Gemini 模型编写。
- **贡献**: 欢迎提交 Pull Request！请注意，PR 也将由 AI 模型进行审查和处理。
- **维护**: 作者本人并非 Python 开发者，不熟悉原项目的具体细节。未来的更新和维护将交由 AI 模型处理。

## 核心功能

- **多 API 接口**:
  - **`/v1beta` 和 `/gemini`**: Gemini 原生代理端点，支持灵活的身份验证（URL 中的 API 密钥、`x-goog-api-key` 请求头或 Bearer 令牌）。
  - **`/openai`**: OpenAI 兼容端点，要求严格的 Bearer 令牌身份验证。
- **智能负载均衡**: 管理一个 Gemini API 密钥池，轮流使用密钥以分配请求负载。
- **自动故障转移与重试**: 如果使用特定密钥的请求失败，系统会自动使用下一个可用密钥重试，确保服务的高可用性。
- **持久化健康跟踪**: 监控密钥失败次数，自动将失败的密钥移出活动池，并将其状态同步到持久化数据库。
- **Web UI 与管理仪表盘**: 一个位于 `/admin` 的综合性管理后台，用于实时管理 API 密钥、调整系统设置和查看日志。
- **动态化与持久化配置**: 所有的配置项（API 密钥、认证令牌等）都存储在持久化的 SQLite 数据库中，并可以通过 Web UI 进行动态修改，无需重启应用。
- **安全身份验证**:
  - 使用动态的 `AUTH_TOKEN` 保护管理仪表盘。
  - 使用灵活的 `ALLOWED_TOKENS` 系统保护 API 端点，所有令牌均通过 UI 进行管理。
- **外部触发的健康检查**: 提供一个安全的 API 端点，供外部 cron 作业调用，以触发对非活动密钥的重新激活检查。

## 项目结构与代码导览

为了更好地理解本项目，我们建议按以下顺序探索文件：

1.  **`prisma/schema.prisma`**: 定义了数据库结构，用于存储 API 密钥 (`ApiKey`) 和动态配置 (`Setting`)。
2.  **`src/lib/settings.ts`**: 负责从数据库中获取和缓存所有应用配置的服务。这是所有配置的“单一真实来源”。
3.  **`src/lib/key-manager.ts`**: `KeyManager` 类，负责所有 API 密钥的管理。它**只从数据库**加载密钥，处理轮换和失败跟踪。
4.  **`src/middleware.ts`**: 所有请求的入口。它使用 `settings.ts` 在每个请求中动态获取认证令牌。
5.  **`src/app/admin`**: 管理后台的代码，包括 UI 组件（如 `KeyTable.tsx`, `ConfigForm.tsx`）和包含所有管理逻辑的 `actions.ts` 文件。
6.  **`/api/cron/health-check`**: 一个安全的 API 端点，当被调用时，会触发对失效 API 密钥的健康检查。

## 快速上手

请按照以下步骤在本地运行本项目。

### 1. 数据库迁移

在不同的环境中，请使用对应的命令来管理数据库结构：

- **开发环境**: 在修改了 `prisma/schema.prisma` 文件后，运行此命令来创建和应用新的迁移。
  ```bash
  pnpm run db:migrate
  ```
- **生产环境**: 在部署新版本时，此命令会安全地应用所有待处理的迁移，而不会重置数据。
  ```bash
  pnpm prisma migrate deploy
  ```

### 2. 安装依赖

进入项目目录并安装所需依赖包。

```bash
pnpm install
```

### 3. 初始化数据库

本项目使用 Prisma 进行数据库管理。运行 `pnpm run db:migrate` 命令来创建您的第一个迁移并初始化数据库。

这将在 `prisma/` 目录下创建一个 `dev.db` 文件。

### 4. 配置环境变量

创建一个 `.env.local` 文件。应用需要以下变量来连接数据库。

- **`DATABASE_URL`**: 您的数据库连接字符串。默认的 `pnpm prisma migrate dev` 命令会在 `prisma/dev.db` 创建一个 SQLite 数据库。
  ```
  DATABASE_URL="file:./prisma/dev.db"
  ```

仅当您需要为 Google API 使用代理时，您才可能需要设置 `GOOGLE_API_HOST`。所有其他设置都通过 Web UI 进行管理。

### 4. 运行开发服务器

启动 Next.js 开发服务器。

```bash
pnpm dev
```

### 5. 首次通过 Web UI 设置

首次运行时，本应用没有任何 API 密钥或安全认证令牌。

1.  **访问仪表盘**: 打开 [http://localhost:3000/admin](http://localhost:3000/admin)。系统将提示您输入密码。
2.  **初始登录**: 由于 `AUTH_TOKEN` 初始为空，您可以**输入任何值**（或留空）并点击“Login”来登录。
3.  **保护您的仪表盘**:
    - 导航到 **Configuration** (配置) 标签页。
    - 在 "Auth Token" 字段中，输入一个新的、强壮的、秘密的密码。
    - 点击 "Save Configuration" (保存配置)。您将立即被登出。
    - 使用您刚设置的新 `AUTH_TOKEN` 重新登录。
4.  **添加 API 密钥**:
    - 导航到 **Keys** (密钥) 标签页。
    - 点击 "Add New Key" (新增密钥) 并粘贴您的 Gemini API 密钥。
5.  **配置 API 访问**:
    - 回到 **Configuration** (配置) 标签页。
    - 在 "Allowed API Tokens" (允许的 API 令牌) 字段中，添加您希望授权给客户端应用的访问令牌。

现在，您的网关已完全配置并准备就绪。

## 使用 Docker 部署

本项目是一个**有状态应用**，需要一个持久化的数据库。项目提供的 `Dockerfile` 和 `docker-compose.yml` 已为生产部署进行了优化。

### 部署原则

- **动态配置**: 应用被设计为在运行时通过 Web UI 进行配置。Docker 镜像本身是通用的，不包含任何秘密信息。
- **数据持久化**: `docker-compose.yml` 文件已配置为将本地的 `./data` 目录挂载到容器内的 `/app/data` 目录。这确保了您的 SQLite 数据库（以及所有配置）在容器重启后依然存在。
- **自动迁移**: `entrypoint.sh` 脚本会在每次容器启动时自动运行数据库迁移命令 (`prisma migrate deploy`)，确保您的数据库结构始终是最新版本。

### 使用 Docker Compose 运行

1.  **创建并配置 `.env` 文件**:

    为您的生产环境创建一个 `.env` 文件。`docker-compose.yml` 文件已配置为加载此文件。

    - **`DATABASE_URL` (强制性)**: 此变量是必需的。Compose 设置已配置为将数据库放置在 `/app/data` 的持久卷中。
    - **`CRON_SECRET` (推荐)**: 要使用外部健康检查功能，您必须设置一个安全的 secret token。

    您的 `.env` 文件应如下所示：

    ```env
    # 强制性：生产数据库在容器内的路径
    DATABASE_URL="file:/app/data/prod.db"

    # 推荐：用于 cron 作业端点的长的、随机的 secret
    CRON_SECRET="your-long-random-secret-token"
    ```

    仅当您需要覆盖默认值时，才需要添加像 `GOOGLE_API_HOST` 这样的其他变量。所有其他设置都在部署后通过 Web UI 进行管理。

2.  **构建并运行容器**:

    ```bash
    docker-compose up --build -d
    ```

3.  **执行首次设置**: 遵循与本地开发指南中相同的“首次通过 Web UI 设置”步骤，但请使用您服务器的 IP 地址访问应用 (例如, `http://YOUR_SERVER_IP:3000`)。

4.  **(可选) 配置 Cron 作业**: 为了启用失效 API 密钥的自动重新激活，请遵循下面的“外部 Cron 作业健康检查”部分的说明。

## 使用 Cloudflare Pages 部署

本项目可以被部署到 Cloudflare Pages，并使用 Cloudflare D1 作为其数据库。`feat/cloudflare` 分支已包含所有必要的代码修改。

### 1. 推送代码到 GitHub

确保您已经将 `feat/cloudflare` 分支推送到您的 GitHub 远程仓库。

```bash
git push origin feat/cloudflare
```

### 2. 在 Cloudflare 中创建 Pages 项目

1.  登录到 Cloudflare 仪表板，导航到 **Workers & Pages**。
2.  点击 **Create application** > **Pages** > **Connect to Git**。
3.  选择您的项目仓库 (`gemini-balance-nextjs`) 并点击 **Begin setup**。

### 3. 配置构建与部署

在 **“Set up builds and deployments”** 页面:

- **Production branch**: 选择 `feat/cloudflare` (或者您希望作为生产环境的分支)。
- **Build command**: `pnpm run build`
- **Build output directory**: `.next`
- **Framework preset**: 选择 `Next.js`。

### 4. 创建 D1 数据库

1.  在 Cloudflare 仪表板中，导航到 **Workers & Pages** > **D1**。
2.  点击 **Create database**，给您的数据库起一个名字 (例如 `gemini-balance-db`)，并选择一个位置。

### 5. 绑定 D1 数据库到 Pages 项目

1.  回到您的 Pages 项目设置页面 (`Settings` > `Functions`)。
2.  在 **D1 database bindings** 部分，点击 **Add binding**。
3.  **Variable name**: 输入 `D1_DATABASE` (这必须与代码中的设置匹配)。
4.  **D1 database**: 选择您在上一步中创建的数据库。

### 6. 配置环境变量

在 Pages 项目的 `Settings` > `Environment variables` 中，为 **Production** 环境添加以下变量：

- `DATABASE_URL`: `prisma://localhost/dev?schema=./prisma/schema.prisma` (此变量仅在构建阶段需要，运行时会被 D1 绑定覆盖)。
- `CRON_SECRET`: (可选) 如果您需要使用健康检查功能，请设置一个安全的 Cron Secret。

### 7. 部署和首次设置

1.  点击 **Save and Deploy**。Cloudflare 将开始构建和部署您的应用。
2.  部署完成后，访问您的应用 URL (`YOUR_APP.pages.dev`)。
3.  遵循与本地开发指南中相同的“首次通过 Web UI 设置”步骤来初始化您的应用，包括设置管理员密码和添加 API 密钥。

## 外部 Cron 作业健康检查

本应用依赖一个外部的 cron 作业来定期检查非活动 API 密钥的健康状况并重新激活它们。应用为此提供了一个安全的端点。

### 1. 设置 Cron Secret

为了保护 cron 端点，您必须设置 `CRON_SECRET` 环境变量。

- 对于**本地开发**，请将其添加到您的 `.env.local` 文件中。
- 对于**Docker 部署**，请按照“使用 Docker 部署”部分的说明将其添加到 `.env` 文件中。

请为这个值选择一个长的、随机的且难以猜测的字符串。

### 2. 配置您的 Cron 服务

您需要在您的服务器上或使用第三方服务（如 `cron-job.org` 或您托管平台的功能，如 Coolify）来设置一个 cron 作业。

该作业应配置为定期运行一个 `curl` 命令。我们建议**每小时运行一次**。

以下是需要执行的命令：

```bash
curl -X GET -H "Authorization: Bearer YOUR_CRON_SECRET" http://YOUR_APP_URL/api/cron/health-check
```

- 将 `YOUR_CRON_SECRET` 替换为您在环境变量中设置的相同 secret 值。
- 将 `YOUR_APP_URL` 替换为您应用的公共 URL（例如，本地测试时为 `http://localhost:3000`，生产环境中为 `https://your-domain.com`）。

此设置可确保您的密钥得到定期检查和维护，而无需在应用内部集成调度程序。

## 使用 GitHub Actions 进行 CI/CD

项目包含的 GitHub Actions 工作流是为现代化的、无需配置的部署流程而设计的。

- **它做什么**: 每当有代码推送到 `master` 分支时，该 action 会构建一个**通用的、无配置的** Docker 镜像，并将其推送到 GitHub Container Registry (`ghcr.io`)。
- **无需 Secrets**: 该工作流**不**需要任何诸如 `GEMINI_API_KEYS` 或 `AUTH_TOKEN` 之类的秘密信息。它构建的镜像是普适的。
- **如何使用**:
  1.  Fork 本仓库。
  2.  GitHub Action 将自动运行，并将镜像推送到 `ghcr.io/YOUR_USERNAME/gemini-balance-nextjs`。
  3.  在您的服务器上，您只需拉取最新的镜像 (`docker pull ghcr.io/YOUR_USERNAME/gemini-balance-nextjs:latest`) 并重启您的 Docker Compose 服务即可完成更新。
  4.  为了实现全自动化部署，您可以使用像 [Watchtower](https://containrrr.dev/watchtower/) 这样的服务，或您托管平台（如 Coolify）提供的 webhook，来自动拉取新镜像并重新部署。

### 6. 探索应用

- **管理仪表盘**: 打开 [http://localhost:3000/admin](http://localhost:3000/admin) 并使用您在 UI 中配置的 `AUTH_TOKEN` 登录。
- **API 端点**: 使用 `curl` 或 Postman 等工具与 API 端点交互，请提供您在“Allowed API Tokens”中配置的令牌。

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
